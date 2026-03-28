/**
 * Local Anthropic API proxy — routes through Claude Code CLI ($200 plan).
 * Usage: node proxy.mjs
 *
 * Supports both plain text and tool_use (structured output) requests.
 */
import http from "node:http";
import crypto from "node:crypto";
import { spawn } from "node:child_process";

const PORT = 42069;
const MAX_BODY_SIZE = 1_000_000;
const MAX_PROMPT_LENGTH = 50_000;

function runClaude(prompt) {
  return new Promise((resolve, reject) => {
    const child = spawn("npx", ["@anthropic-ai/claude-code", "-p", "--output-format", "json"], {
      timeout: 120_000,
      shell: process.platform === "win32",
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => { stdout += d; });
    child.stderr.on("data", (d) => { stderr += d; });

    child.on("close", (code) => {
      if (code !== 0) reject(new Error(`exit ${code}: ${stderr || stdout}`));
      else resolve(stdout);
    });
    child.on("error", reject);

    child.stdin.write(prompt);
    child.stdin.end();
  });
}

/**
 * Extract the first JSON object from a string that may contain
 * markdown fences, explanatory text, etc.
 */
function extractJSON(text) {
  // Try direct parse first
  try { return JSON.parse(text); } catch {}

  // Try extracting from markdown code fence
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1].trim()); } catch {}
  }

  // Try finding first { ... } block
  const braceStart = text.indexOf("{");
  if (braceStart !== -1) {
    let depth = 0;
    for (let i = braceStart; i < text.length; i++) {
      if (text[i] === "{") depth++;
      else if (text[i] === "}") depth--;
      if (depth === 0) {
        try { return JSON.parse(text.slice(braceStart, i + 1)); } catch { break; }
      }
    }
  }

  return null;
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key, anthropic-version");

  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  const origin = req.headers.origin;
  const host = req.headers.host;
  if (origin && origin !== "http://localhost:3000") { res.writeHead(403); res.end(); return; }
  if (host && host !== "localhost:42069" && host !== "127.0.0.1:42069") { res.writeHead(403); res.end(); return; }

  if (req.method !== "POST" || !req.url?.includes("/v1/messages")) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Only POST /v1/messages is supported" }));
    return;
  }

  const chunks = [];
  let totalSize = 0;
  for await (const chunk of req) {
    totalSize += chunk.length;
    if (totalSize > MAX_BODY_SIZE) { res.writeHead(413); res.end(); return; }
    chunks.push(chunk);
  }

  let body;
  try { body = JSON.parse(Buffer.concat(chunks).toString()); }
  catch { res.writeHead(400); res.end(JSON.stringify({ error: "Invalid JSON" })); return; }

  // Detect if this is a tool_use / structured output request
  const hasTools = Array.isArray(body.tools) && body.tools.length > 0;
  const toolChoice = body.tool_choice;
  const targetTool = hasTools && toolChoice?.type === "tool"
    ? body.tools.find((t) => t.name === toolChoice.name)
    : hasTools ? body.tools[0] : null;

  const systemPrompt = typeof body.system === "string" ? body.system : "";
  const messages = Array.isArray(body.messages)
    ? body.messages.filter((m) => typeof m.role === "string" && typeof m.content === "string")
    : [];
  const userMessages = messages
    .map((m) => (m.role === "user" ? m.content : `[assistant]: ${m.content}`))
    .join("\n\n");

  let fullPrompt;
  if (targetTool) {
    // For structured output: instruct Claude to respond with pure JSON
    const schema = targetTool.input_schema;
    fullPrompt = [
      systemPrompt,
      userMessages,
      "",
      `IMPORTANT: You MUST respond with ONLY a valid JSON object matching this schema. No explanation, no markdown, no code fences — just the raw JSON object.`,
      `Schema: ${JSON.stringify(schema)}`,
    ].filter(Boolean).join("\n\n");
  } else {
    fullPrompt = systemPrompt ? `${systemPrompt}\n\n${userMessages}` : userMessages;
  }

  if (fullPrompt.length > MAX_PROMPT_LENGTH) fullPrompt = fullPrompt.slice(0, MAX_PROMPT_LENGTH);

  try {
    const stdout = await runClaude(fullPrompt);

    // Parse CLI output
    let text;
    try {
      const parsed = JSON.parse(stdout);
      text = parsed.result ?? parsed.text ?? parsed.content ?? stdout;
    } catch {
      text = stdout.trim();
    }

    // Build response based on request type
    if (targetTool) {
      // Structured output: wrap as tool_use block
      const jsonResult = extractJSON(text);
      if (jsonResult) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          id: `msg_${crypto.randomUUID()}`,
          type: "message",
          role: "assistant",
          content: [{
            type: "tool_use",
            id: `toolu_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`,
            name: targetTool.name,
            input: jsonResult,
          }],
          model: body.model || "claude-sonnet-4-20250514",
          stop_reason: "tool_use",
          usage: { input_tokens: 0, output_tokens: 0 },
        }));
      } else {
        // Couldn't parse JSON — return as text with error
        console.error("Proxy: failed to extract JSON from structured response:", text.slice(0, 200));
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          type: "error",
          error: { type: "api_error", message: "Could not parse structured response from CLI" },
        }));
      }
    } else {
      // Plain text response
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        id: `msg_${crypto.randomUUID()}`,
        type: "message",
        role: "assistant",
        content: [{ type: "text", text }],
        model: body.model || "claude-sonnet-4-20250514",
        stop_reason: "end_turn",
        usage: { input_tokens: 0, output_tokens: 0 },
      }));
    }
  } catch (err) {
    console.error("Proxy error:", err.message);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      type: "error",
      error: { type: "api_error", message: "Internal proxy error" },
    }));
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Proxy running at http://localhost:${PORT}`);
  console.log("Supports: plain text + tool_use (structured output)");
});
