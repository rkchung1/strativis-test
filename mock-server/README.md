# Mock API Server

A small Node/Express server for use during the coding test. It serves candidate data and a mock chat endpoint so you can build against a real-feeling API.

## Setup

```bash
cd mock-server
npm install
npm start
```

The server listens on **http://localhost:4000**.

## Authentication

All `/v1/candidates*` endpoints require an `X-API-Key` header.

**Dev key:** `dev-local-key-1234`

The `/v1/chat` endpoint does **not** require a key — it's intended for the Part 4 bonus.

## Endpoints

### `GET /v1/candidates`

Returns the list of candidates.

Optional query params:
- `role` — case-insensitive substring match on the candidate's role (e.g. `?role=frontend`).

Response shape:
```json
{
  "data": [ { "id": "c001", "name": "...", ... } ],
  "count": 15
}
```

### `GET /v1/candidates/:id`

Returns a single candidate by ID. Returns `404` if not found.

### `POST /v1/chat`

Body: `{ "message": "your question here" }`

Returns:
```json
{
  "reply": "...",
  "model": "mock-llm-v1",
  "timestamp": "...",
  "disclaimer": "AI-generated. Verify before acting."
}
```

## Intentional quirks

The server deliberately misbehaves to mimic real-world conditions:

- **Variable latency** — responses take between 200ms and 3000ms.
- **Random failures** — roughly 1 in 10 requests returns `500`. The chat endpoint occasionally returns `503`.
- **Dirty data** — a few records have missing or wrong-typed fields (e.g. `fitScore` as a string, missing `summary`). On each list response, additional records may also be mangled.

Handling these gracefully is part of the test. **Don't try to remove or work around these quirks** — that's the point.

## Quick smoke test

```bash
curl -H "X-API-Key: dev-local-key-1234" http://localhost:4000/v1/candidates | head
```
