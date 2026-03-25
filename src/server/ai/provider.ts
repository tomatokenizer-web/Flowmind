import Anthropic from "@anthropic-ai/sdk";
import type { ZodType } from "zod";
import { logger } from "../logger";
import { env } from "@/env";

// ─── Types ────────────────────────────────────────────────────────────────

export interface AIGenerateTextOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  /** Override the default model for this request (useful for testing) */
  model?: string;
}

export interface AIGenerateStructuredOptions<T> extends AIGenerateTextOptions {
  /** JSON schema description sent to the AI in the prompt */
  schema: {
    name: string;
    description: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
  /** Zod schema for runtime validation of the AI response */
  zodSchema: ZodType<T>;
}

export interface AIProvider {
  generateText(prompt: string, options?: AIGenerateTextOptions): Promise<string>;
  generateStructured<T>(
    prompt: string,
    options: AIGenerateStructuredOptions<T>
  ): Promise<T>;
}

// ─── Anthropic Provider ───────────────────────────────────────────────────

export class AnthropicProvider implements AIProvider {
  private client: Anthropic;
  private defaultModel: string;

  constructor(apiKey?: string, model?: string) {
    // Resolve the API key: explicit arg > env config > SDK reads process.env
    const resolvedKey = apiKey ?? env.ANTHROPIC_API_KEY;

    // When using a proxy (ANTHROPIC_BASE_URL), API key validation is skipped
    if (!resolvedKey && !process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_BASE_URL) {
      throw new Error(
        "ANTHROPIC_API_KEY is not configured. Set it in your .env file."
      );
    }

    this.client = new Anthropic({
      apiKey: resolvedKey,
      ...(process.env.ANTHROPIC_BASE_URL && {
        baseURL: process.env.ANTHROPIC_BASE_URL,
      }),
    });
    this.defaultModel = model ?? env.AI_MODEL;
  }

  /**
   * Resolve the model to use: per-request override > constructor default > env default.
   */
  private resolveModel(requestModel?: string): string {
    return requestModel ?? this.defaultModel;
  }

  async generateText(
    prompt: string,
    options: AIGenerateTextOptions = {}
  ): Promise<string> {
    const { maxTokens = 1024, temperature = 0.7, systemPrompt, model } = options;
    const resolvedModel = this.resolveModel(model);

    try {
      const response = await this.client.messages.create({
        model: resolvedModel,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: [{ role: "user", content: prompt }],
      });

      const textBlock = response.content.find((block) => block.type === "text");
      return textBlock?.type === "text" ? textBlock.text : "";
    } catch (error) {
      logger.error({ error, model: resolvedModel }, "Anthropic generateText failed");
      throw error;
    }
  }

  async generateStructured<T>(
    prompt: string,
    options: AIGenerateStructuredOptions<T>
  ): Promise<T> {
    const { maxTokens = 2048, temperature = 0.3, systemPrompt, schema, model } = options;
    const resolvedModel = this.resolveModel(model);

    const toolName = "structured_output";

    // Build JSON Schema input_schema from the caller-provided schema descriptor
    const inputSchema: Record<string, unknown> = {
      type: "object" as const,
      properties: schema.properties,
    };
    if (schema.required) {
      inputSchema.required = schema.required;
    }

    try {
      const response = await this.client.messages.create({
        model: resolvedModel,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: [{ role: "user", content: prompt }],
        tools: [
          {
            name: toolName,
            description: schema.description,
            input_schema: inputSchema as Anthropic.Messages.Tool["input_schema"],
          },
        ],
        tool_choice: { type: "tool", name: toolName },
      });

      // Extract the structured result from the tool_use content block
      const toolUseBlock = response.content.find(
        (block) => block.type === "tool_use" && block.name === toolName
      );

      if (!toolUseBlock || toolUseBlock.type !== "tool_use") {
        throw new Error(
          `No tool_use block found in response for schema "${schema.name}"`
        );
      }

      // Zod validation as safety net
      const validated = options.zodSchema.parse(toolUseBlock.input);
      return validated;
    } catch (error) {
      logger.error(
        { error, schemaName: schema.name, model: resolvedModel },
        "Anthropic generateStructured failed: tool_use extraction or Zod validation error"
      );
      throw error;
    }
  }
}

// ─── Provider Factory ─────────────────────────────────────────────────────

let defaultProvider: AIProvider | null = null;

/**
 * Get the default AI provider singleton.
 * Uses env.AI_MODEL for the default model.
 */
export function getAIProvider(): AIProvider {
  if (!defaultProvider) {
    defaultProvider = new AnthropicProvider();
  }
  return defaultProvider;
}

/**
 * Replace the default provider (useful for testing with mocks).
 */
export function setAIProvider(provider: AIProvider): void {
  defaultProvider = provider;
}

/**
 * Reset the cached provider so it re-reads env on next call.
 * Useful in tests or when env changes at runtime.
 */
export function resetAIProvider(): void {
  defaultProvider = null;
}

/**
 * Get the configured embedding model name from env.
 */
export function getEmbeddingModel(): string {
  return env.AI_EMBEDDING_MODEL;
}
