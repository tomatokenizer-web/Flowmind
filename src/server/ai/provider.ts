import { exec } from "node:child_process";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import { writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import type { ZodType } from "zod";
import { logger } from "../logger";
import { env } from "@/env";

const execAsync = promisify(exec);

// ─── Serial queue for Claude CLI calls ──────────────────────────────────────

const MAX_RETRIES = 2;
const BASE_DELAY_MS = 3_000;

let queueTail: Promise<unknown> = Promise.resolve();

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const task = queueTail.then(fn, fn);
  queueTail = task.catch(() => {});
  return task;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isRateLimitError(msg: string): boolean {
  return msg.includes("rate limit") || msg.includes("429") || msg.includes("Too many") || msg.includes("overloaded");
}

/**
 * Execute Claude CLI by writing prompt to a temp file and piping it.
 * Uses exec (shell) to resolve claude.cmd on Windows.
 * Runs from tmpdir to skip CLAUDE.md/MCP loading.
 * Strips ANTHROPIC_API_KEY so CLI uses OAuth subscription.
 */
function execClaude(args: string[], prompt: string): Promise<string> {
  const childEnv = { ...process.env };
  delete childEnv.ANTHROPIC_API_KEY;

  const ts = Date.now();
  const promptFile = join(tmpdir(), `claude-prompt-${ts}.txt`);
  writeFileSync(promptFile, prompt, "utf8");

  const escapedArgs = args.map((a) => {
    if (a.includes('"') || a.includes(" ") || a.includes("{")) {
      return `"${a.replace(/"/g, '\\"')}"`;
    }
    return a;
  });

  const cmd = `claude ${escapedArgs.join(" ")} < "${promptFile}"`;

  return execAsync(cmd, {
    env: { ...childEnv, PYTHONIOENCODING: "utf-8" },
    cwd: tmpdir(),
    timeout: 300_000,
    maxBuffer: 2 * 1024 * 1024,
    encoding: "utf8",
  }).then(({ stdout }) => {
    try { unlinkSync(promptFile); } catch {}
    return stdout;
  }).catch((err) => {
    try { unlinkSync(promptFile); } catch {}
    throw err;
  });
}

/**
 * Run Claude CLI with serial queue + retry on rate limits.
 */
function runClaude(args: string[], prompt: string): Promise<string> {
  return enqueue(async () => {
    let lastError: Error | undefined;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await execClaude(args, prompt);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (isRateLimitError(lastError.message) && attempt < MAX_RETRIES) {
          const delay = BASE_DELAY_MS * 2 ** attempt;
          logger.warn({ attempt, delay }, "Claude CLI rate limited, retrying...");
          await sleep(delay);
        } else {
          throw lastError;
        }
      }
    }
    throw lastError;
  });
}

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

// ─── Claude CLI Provider (uses local Claude subscription) ─────────────────

/**
 * Maps model aliases used in the app to Claude CLI model names.
 */
function resolveCliModel(model: string): string {
  if (model.includes("haiku")) return "haiku";
  if (model.includes("opus")) return "opus";
  return "sonnet";
}

export class ClaudeCliProvider implements AIProvider {
  private defaultModel: string;

  constructor(model?: string) {
    this.defaultModel = model ?? env.AI_MODEL;
  }

  private resolveModel(requestModel?: string): string {
    return requestModel ?? this.defaultModel;
  }

  async generateText(
    prompt: string,
    options: AIGenerateTextOptions = {}
  ): Promise<string> {
    const { systemPrompt, model } = options;
    const resolvedModel = resolveCliModel(this.resolveModel(model));

    const fullPrompt = systemPrompt
      ? `${systemPrompt}\n\n---\n\n${prompt}`
      : prompt;

    try {
      const stdout = await runClaude(
        ["--print", "--model", resolvedModel],
        fullPrompt,
      );

      return stdout.trim();
    } catch (error) {
      logger.error({ error, model: resolvedModel }, "Claude CLI generateText failed");
      throw error;
    }
  }

  async generateStructured<T>(
    prompt: string,
    options: AIGenerateStructuredOptions<T>
  ): Promise<T> {
    const { systemPrompt, schema, model } = options;
    const resolvedModel = resolveCliModel(this.resolveModel(model));

    const jsonSchema: Record<string, unknown> = {
      type: "object",
      properties: schema.properties,
    };
    if (schema.required) {
      jsonSchema.required = schema.required;
    }

    const schemaInstruction = [
      `You MUST respond with ONLY valid JSON matching this schema:`,
      "```json",
      JSON.stringify(jsonSchema, null, 2),
      "```",
      `No markdown, no explanation, no extra text. Only the JSON object.`,
    ].join("\n");

    const fullPrompt = [
      systemPrompt,
      schemaInstruction,
      "---",
      prompt,
    ].filter(Boolean).join("\n\n");

    try {
      const stdout = await runClaude(
        ["--print", "--model", resolvedModel],
        fullPrompt,
      );

      const trimmed = stdout.trim();
      const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error(`No JSON object found in Claude CLI response for schema "${schema.name}"`);
      }

      const parsed = JSON.parse(jsonMatch[0]) as unknown;
      const validated = options.zodSchema.parse(parsed);
      return validated;
    } catch (error) {
      logger.error(
        { error, schemaName: schema.name, model: resolvedModel },
        "Claude CLI generateStructured failed"
      );
      throw error;
    }
  }
}

// ─── Anthropic SDK Provider (uses API key or proxy) ───────────────────────

export class AnthropicProvider implements AIProvider {
  private client: Anthropic;
  private defaultModel: string;

  constructor(apiKey?: string, model?: string) {
    const resolvedKey = apiKey ?? env.ANTHROPIC_API_KEY;

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

      const toolUseBlock = response.content.find(
        (block) => block.type === "tool_use" && block.name === toolName
      );

      if (!toolUseBlock || toolUseBlock.type !== "tool_use") {
        throw new Error(
          `No tool_use block found in response for schema "${schema.name}"`
        );
      }

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
 * Uses Claude CLI if no valid API key is set, otherwise falls back to Anthropic SDK.
 */
export function getAIProvider(): AIProvider {
  if (!defaultProvider) {
    // Always use Claude CLI — routes through local OAuth subscription.
    // The system may have a stale ANTHROPIC_API_KEY env var with no credits;
    // Claude CLI with OAuth bypasses that entirely.
    logger.info("AI provider: Claude CLI (local subscription)");
    defaultProvider = new ClaudeCliProvider();
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
