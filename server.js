// server.js — OmanX MVP (Express + OpenAI) — fixed for Express 5 wildcard routing

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import OpenAI from "openai";
import fs from "fs";
import { SYSTEM_POLICY, buildKnowledgeText } from "./prompts.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;

if (!process.env.OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY in environment (.env).");
  process.exit(1);
}

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Load knowledge base once at startup (simple MVP)
const knowledgePath = path.join(__dirname, "knowledge.json");
let knowledgeJson;
try {
  knowledgeJson = JSON.parse(fs.readFileSync(knowledgePath, "utf8"));
} catch (e) {
  console.error("Failed to read knowledge.json:", e?.message || e);
  process.exit(1);
}
const knowledgeText = buildKnowledgeText(knowledgeJson);

const app = express();

// Body parsing
app.use(express.json({ limit: "1mb" }));

// Serve static frontend
app.use(express.static(path.join(__dirname, "public")));

// Health check
app.get("/health", (_req, res) => res.json({ ok: true }));

// Chat endpoint (Responses API content type must be input_text)
app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body || {};
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Missing 'message' string." });
    }

    console.log("[CHAT]", message);

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: [
            { type: "input_text", text: SYSTEM_POLICY.trim() },
            {
              type: "input_text",
              text: `\n\nKNOWLEDGE (approved sources):\n${knowledgeText}\n`,
            },
          ],
        },
        {
          role: "user",
          content: [{ type: "input_text", text: message }],
        },
      ],
    });

    const text = response.output_text || "I couldn't generate a response right now.";
    return res.json({ text });
  } catch (err) {
    console.error("Error in /chat:", err?.message || err);
    return res.status(500).json({ error: "Server error." });
  }
});

// SPA fallback (Express 5-safe: do NOT use app.get("*", ...))
app.use((_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const server = app.listen(PORT, () => {
  console.log(`OmanX MVP running on http://localhost:${PORT}`);
});

// Graceful shutdown (MVP-safe)
function shutdown(signal) {
  console.log(`${signal} received. Shutting down...`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
