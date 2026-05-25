/**
 * Mock API server.
 *
 * Start with:  npm install && npm start
 * Default URL: http://localhost:4000
 */

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 4000;
const API_KEY = "dev-local-key-1234";

const candidates = JSON.parse(
  fs.readFileSync(path.join(__dirname, "candidates.json"), "utf8"),
);

app.use(cors());
app.use(express.json());

// Log requests for debugging convenience.
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Simple API-key check.
function requireApiKey(req, res, next) {
  const key = req.header("X-API-Key");
  if (key !== API_KEY) {
    return res.status(401).json({
      error: "Missing or invalid X-API-Key header.",
      hint: "See mock-server/README.md for the dev key.",
    });
  }
  next();
}

// Random latency to simulate a real-world feed.
function fakeLatency() {
  const min = 200,
    max = 3000;
  return Math.floor(Math.random() * (max - min)) + min;
}

// Roughly 1 in 10 requests should fail.
function maybeFail() {
  return Math.random() < 0.1;
}

// Quietly mangle a couple of records on each list response.
function maybeMangle(list) {
  return list.map((c) => {
    const copy = { ...c };
    // ~5% chance: drop the summary field entirely.
    if (Math.random() < 0.05) delete copy.summary;
    // ~5% chance: stringify the fitScore.
    if (Math.random() < 0.05 && typeof copy.fitScore === "number") {
      copy.fitScore = String(copy.fitScore);
    }
    return copy;
  });
}

app.get("/v1/candidates", requireApiKey, (req, res) => {
  setTimeout(() => {
    if (maybeFail()) {
      return res
        .status(500)
        .json({ error: "Simulated server error. Try again." });
    }
    let result = candidates;
    if (req.query.role) {
      const q = String(req.query.role).toLowerCase();
      result = result.filter((c) => c.role.toLowerCase().includes(q));
    }
    res.json({ data: maybeMangle(result), count: result.length });
  }, fakeLatency());
});

app.get("/v1/candidates/:id", requireApiKey, (req, res) => {
  setTimeout(() => {
    if (maybeFail()) {
      return res
        .status(500)
        .json({ error: "Simulated server error. Try again." });
    }
    const candidate = candidates.find((c) => c.id === req.params.id);
    if (!candidate) {
      return res
        .status(404)
        .json({ error: `No candidate with id ${req.params.id}` });
    }
    res.json({ data: candidate });
  }, fakeLatency());
});

// Mock LLM chat endpoint for the Part 4 bonus prototype. Deterministic-ish
// canned responses keyed off the incoming text.
app.post("/v1/chat", (req, res) => {
  const userMessage =
    req.body && req.body.message ? String(req.body.message) : "";
  const lower = userMessage.toLowerCase();

  let reply;
  if (!userMessage.trim()) {
    reply = "I didn't catch that — could you rephrase your question?";
  } else if (lower.includes("vacation") || lower.includes("pto")) {
    reply =
      "Standard policy is 25 days for level 3+ employees in Germany, plus public holidays. Please confirm with your HR partner — policies vary by contract type.";
  } else if (lower.includes("summarize") || lower.includes("summary")) {
    reply =
      "Here's a brief summary based on the available interview notes: the candidate demonstrated strong technical skills, asked thoughtful questions, and engaged well with the panel. Note: this is an AI-generated summary; please review the source notes before any decision.";
  } else if (lower.includes("rejection") || lower.includes("reject")) {
    reply =
      "Draft rejection email:\n\nDear [Candidate],\n\nThank you for taking the time to interview with us. After careful consideration, we have decided not to move forward at this time. We appreciate your interest and wish you the best.\n\nBest regards,\nThe Hiring Team\n\n(Please review and personalize before sending.)";
  } else {
    reply = `I can help with HR-related questions like policy lookups, summarizing interview notes, or drafting candidate communications. You asked: "${userMessage.slice(0, 120)}". Could you give me a bit more context?`;
  }

  // Simulate LLM "thinking" time and an occasional failure.
  setTimeout(
    () => {
      if (Math.random() < 0.05) {
        return res
          .status(503)
          .json({ error: "AI service temporarily unavailable." });
      }
      res.json({
        reply,
        model: "mock-llm-v1",
        timestamp: new Date().toISOString(),
        disclaimer: "AI-generated. Verify before acting.",
      });
    },
    800 + Math.floor(Math.random() * 1500),
  );
});

app.get("/", (_req, res) => {
  res
    .type("text/plain")
    .send(
      "HR AI Mock Server\n" +
        "Endpoints:\n" +
        "  GET  /v1/candidates\n" +
        "  GET  /v1/candidates/:id\n" +
        "  POST /v1/chat\n" +
        "Requires X-API-Key header (except /v1/chat). See README.md.\n",
    );
});

app.listen(PORT, () => {
  console.log(`\nMock server listening on http://localhost:${PORT}`);
  console.log(`Use X-API-Key: ${API_KEY}\n`);
});
