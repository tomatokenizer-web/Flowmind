/**
 * Local Anthropic API proxy — routes through Claude Code CLI ($200 plan).
 * Usage: node proxy.mjs
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
      shell: true,
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

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key, anthropic-version");

  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  // Validate Origin/Host
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

  const systemPrompt = typeof body.system === "string" ? body.system : "";
  const messages = Array.isArray(body.messages)
    ? body.messages.filter((m) => typeof m.role === "string" && typeof m.content === "string")
    : [];
  const userMessages = messages
    .map((m) => (m.role === "user" ? m.content : `[assistant]: ${m.content}`))
    .join("\n\n");

  let fullPrompt = systemPrompt ? `${systemPrompt}\n\n${userMessages}` : userMessages;
  if (fullPrompt.length > MAX_PROMPT_LENGTH) fullPrompt = fullPrompt.slice(0, MAX_PROMPT_LENGTH);

  try {
    const stdout = await runClaude(fullPrompt);

    // Claude CLI returns {"type":"result","result":"..."} format
    let text;
    try {
      const parsed = JSON.parse(stdout);
      text = parsed.result ?? parsed.text ?? parsed.content ?? stdout;
    } catch {
      text = stdout.trim();
    }

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
});
