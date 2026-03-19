import Anthropic from "@anthropic-ai/sdk";
import { logger } from "../logger";

// ─── Types ────────────────────────────────────────────────────────────────

export interface AIGenerateTextOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface AIGenerateStructuredOptions<T> extends AIGenerateTextOptions {
  schema: {
    name: string;
    description: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
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
  private model: string;

  constructor(apiKey?: string, model = "claude-sonnet-4-20250514") {
    this.client = new Anthropic({
      apiKey: apiKey ?? process.env.ANTHROPIC_API_KEY,
    });
    this.model = model;
  }

  async generateText(
    prompt: string,
    options: AIGenerateTextOptions = {}
  ): Promise<string> {
    const { maxTokens = 1024, temperature = 0.7, systemPrompt } = options;

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: [{ role: "user", content: prompt }],
      });

      const textBlock = response.content.find((block) => block.type === "text");
      return textBlock?.type === "text" ? textBlock.text : "";
    } catch (error) {
      logger.error({ error }, "Anthropic generateText failed");
      throw error;
    }
  }

  async generateStructured<T>(
    prompt: string,
    options: AIGenerateStructuredOptions<T>
  ): Promise<T> {
    const { maxTokens = 2048, temperature = 0.3, systemPrompt, schema } = options;

    const structuredPrompt = `${prompt}

Respond with a valid JSON object matching this schema:
${JSON.stringify(schema, null, 2)}

Return ONLY the JSON object, no additional text or markdown.`;

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: maxTokens,
        temperature,
        system:
          systemPrompt ??
          "You are a helpful assistant that responds only with valid JSON.",
        messages: [{ role: "user", content: structuredPrompt }],
      });

      const textBlock = response.content.find((block) => block.type === "text");
      const text = textBlock?.type === "text" ? textBlock.text : "{}";

      // Extract JSON from potential markdown code blocks
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, text];
      const jsonString = jsonMatch[1]?.trim() ?? text.trim();

      return JSON.parse(jsonString) as T;
    } catch (error) {
      logger.error({ error }, "Anthropic generateStructured failed");
      throw error;
    }
  }
}

// ─── Provider Factory ─────────────────────────────────────────────────────

let defaultProvider: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (!defaultProvider) {
    defaultProvider = new AnthropicProvider();
  }
  return defaultProvider;
}

export function setAIProvider(provider: AIProvider): void {
  defaultProvider = provider;
}
