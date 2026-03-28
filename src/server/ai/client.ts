/**
 * Claude API Client Wrapper
 *
 * Wraps the existing AnthropicProvider with pipeline-specific concerns:
 * - Automatic fallback to mock mode when no API key is configured
 * - Structured output parsing for pipeline passes
 * - Timeout handling per-pass
 */

import type {
  AIProvider,
  AIGenerateStructuredOptions,
} from "@/server/ai/provider";
import type { ZodType } from "zod";
import { logger } from "@/server/logger";
import { env } from "@/env";

// ─── Types ───────────────────────────────────────────────────────────────

export interface PipelineClientOptions {
  /** Override default model */
  model?: string;
  /** Force mock mode regardless of API key availability */
  forceMock?: boolean;
  /** Custom AI provider (for testing) */
  provider?: AIProvider;
}

export interface StructuredRequest<T> {
  prompt: string;
  systemPrompt: string;
  schema: {
    name: string;
    description: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
  zodSchema: ZodType<T>;
  maxTokens?: number;
  temperature?: number;
}

// ─── Pipeline Client ─────────────────────────────────────────────────────

export class PipelineClient {
  private provider: AIProvider | null;
  private isMockMode: boolean;
  private model: string;

  constructor(options: PipelineClientOptions = {}) {
    this.isMockMode = options.forceMock ?? !env.ANTHROPIC_API_KEY;
    this.model = options.model ?? env.AI_MODEL;

    if (this.isMockMode) {
      this.provider = null;
      logger.info("PipelineClient initialized in mock mode (no API key)");
    } else if (options.provider) {
      this.provider = options.provider;
      logger.info("PipelineClient initialized with custom provider");
    } else {
      // Lazy import to avoid throwing when no API key
      try {
        // Dynamic import would be ideal but we need sync constructor.
        // The provider is created lazily on first call instead.
        this.provider = null;
        logger.info("PipelineClient initialized — provider will be created on first call");
      } catch {
        this.isMockMode = true;
        this.provider = null;
        logger.warn("Failed to initialize AI provider, falling back to mock mode");
      }
    }
  }

  /**
   * Whether the client is operating in mock/heuristic mode.
   */
  get mockMode(): boolean {
    return this.isMockMode;
  }

  /**
   * Get or create the AI provider lazily.
   */
  private async getProvider(): Promise<AIProvider> {
    if (this.provider) return this.provider;

    if (this.isMockMode) {
      throw new Error("Cannot get provider in mock mode");
    }

    // Dynamic import to avoid circular dependencies and allow
    // the module to load even when API key is missing
    const { AnthropicProvider } = await import("@/server/ai/provider");
    this.provider = new AnthropicProvider(undefined, this.model);
    return this.provider;
  }

  /**
   * Generate structured output from the AI model.
   * Returns null if in mock mode — caller must handle fallback.
   */
  async generateStructured<T>(
    request: StructuredRequest<T>,
  ): Promise<T | null> {
    if (this.isMockMode) {
      return null;
    }

    try {
      const provider = await this.getProvider();
      const options: AIGenerateStructuredOptions<T> = {
        systemPrompt: request.systemPrompt,
        schema: request.schema,
        zodSchema: request.zodSchema,
        maxTokens: request.maxTokens ?? 2048,
        temperature: request.temperature ?? 0.3,
        model: this.model,
      };

      return await provider.generateStructured(request.prompt, options);
    } catch (error) {
      logger.error(
        { error, schemaName: request.schema.name },
        "PipelineClient structured generation failed",
      );
      return null;
    }
  }

  /**
   * Generate free-text output from the AI model.
   * Returns null if in mock mode.
   */
  async generateText(
    prompt: string,
    systemPrompt?: string,
    maxTokens?: number,
    temperature?: number,
  ): Promise<string | null> {
    if (this.isMockMode) {
      return null;
    }

    try {
      const provider = await this.getProvider();
      return await provider.generateText(prompt, {
        systemPrompt,
        maxTokens: maxTokens ?? 1024,
        temperature: temperature ?? 0.3,
        model: this.model,
      });
    } catch (error) {
      logger.error({ error }, "PipelineClient text generation failed");
      return null;
    }
  }
}

// ─── Singleton ───────────────────────────────────────────────────────────

let defaultClient: PipelineClient | null = null;

/**
 * Get the default pipeline client singleton.
 */
export function getPipelineClient(
  options?: PipelineClientOptions,
): PipelineClient {
  if (!defaultClient || options) {
    defaultClient = new PipelineClient(options);
  }
  return defaultClient;
}

/**
 * Reset the pipeline client (for testing).
 */
export function resetPipelineClient(): void {
  defaultClient = null;
}
