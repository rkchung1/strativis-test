# Screening Dashboard

A static HR screening dashboard for reviewing AI-assisted interview candidates. The page loads data from a local mock API, then supports client-side search, sort, and minimum fit-score filtering. Mock HR Assistant chat.

## How to run

### Prerequisites

- [Node.js](https://nodejs.org/) (for the mock API server)
- A modern browser

### 1. Start the mock API

```bash
cd mock-server
npm install
npm start
```

The server listens on **http://localhost:4000**. See [mock-server/README.md](mock-server/README.md) for endpoint details, the dev API key, and intentional quirks (latency, random 500s, dirty data).

### 2. Configure the API key (local only)

The candidates API requires an `X-API-Key` header.

```bash
cp api-config.example.js api-config.local.js
```

Set `window.CANDIDATES_API_KEY` in `api-config.local.js` to the dev key from the mock-server README. This file is gitignored.

### 3. Open the dashboard

Open `candidates.html` in your browser (double-click or drag into a tab).

Ensure the mock server is running before refreshing the page.

### Quick check

```bash
curl -H "X-API-Key: dev-local-key-1234" http://localhost:4000/v1/candidates
```

You should see JSON with a `data` array. The dashboard should show ~15 candidate cards after loading.

---

## Design choices

### API key via `api-config.local.js`

Browsers cannot read `.env` files directly. For local development, a small gitignored JS file sets `window.CANDIDATES_API_KEY`. In production, the key would live in server-side environment variables and requests would go through a backend proxy so the key never reaches the client. The local file only prevents committing secrets to the repo; it does not hide the key from the browser.

### One fetch, client-side filters

The mock API supports optional `?role=` filtering on the server. Search by name/role, sort by fit score, and minimum score threshold are implemented in the browser after a single `GET /v1/candidates`. That matches the API surface and keeps filtering instant once data is loaded.

### Defensive normalization

API responses may include missing fields or wrong types (e.g. `fitScore` as `"70"`, no `summary`). Each record is normalized in `normalizeCandidate()` with explicit fallbacks, wrapped in per-row `try/catch` so one bad object does not break the list. The UI shows placeholders such as N/A for unparseable scores and "Summary unavailable." for empty summaries.

### Safe rendering

Candidate name, role, and summary are inserted with `textContent` / `createElement` rather than string-built `innerHTML`, since API strings are untrusted. Static AI badge markup is the only `innerHTML` used.

### Error states

- Network failures, HTTP 401/500, and invalid JSON show a message and "Try again" below the same area. This is separate from the filter empty state (“No candidates match your filters.”).

### Visual hierarchy for screening

Fit score is emphasized. Bonus: AI-generated fields use dashed cyan accent styling and "AI Fit Score" / "AI Summary" badges so recruiters can distinguish machine output from identity fields (name, role). The default sort is high-to-low fit score.

### Dark mode

Theme preference is stored in `localStorage` and respects `prefers-color-scheme` on first visit.

### HR chat assistant

`POST /v1/chat` with `{ "message": "..." }` — no API key. Chat opens from a FAB (floating action button) in a slide-over panel (backdrop click, ×, or Escape to close). The UI shows “AI is thinking…” while waiting, labels user messages as You and assistant replies as AI Assistant. Occasional 503 errors display an error banner; send again to retry.

---

## What I’d improve with more time

- **Backend proxy** — Serve the dashboard and proxy `/v1/candidates` so the API key stays server-side; add user authentication for a real HR deployment.
- **Server-side search and pagination** — For large candidate lists, debounced search and filters should hit the API with query params instead of loading everything into memory.
- **Tests** — Unit tests for `normalizeCandidate()` and filter/sort logic, smoke test for fetch error handling.

---

## Questions

### Part 1

1. How did you decide what to emphasize visually, and what did you deliberately de-emphasize?

I headed each row with the applicant's name and role because I felt naturally that’s where it fits best but de-emphasized their role as it’s likely not a driving factor for recruiting decisions. What I did try to emphasize most visually was the user’s score with a large bold number, corresponding meter, and color band on the badge and card border making the list visually easy to scan and pick out top candidates.

2. HR users may be uncomfortable with the idea of an AI "fit score." Did you do anything in the UI to address that? If not, what would you change?

I surrounded both the fit score and summary in a box labeled AI Fit Score/AI Summary. In a more realistic setting if there were manual responses from the applicant I’d give those parts a similar tag to easily differentiate between user response and AI.

### Part 2

3. Explain how your code would change if the list had 50,000 candidates instead of 5. You don't have to implement it — describe the approach.

With this many candidates we’d want the data to be stored in a database instead of a JS array. This would allow us to send the query parameters via an API and easily query on the database side which is much faster and scalable. The code would change by no longer using a function to filter candidates locally. Instead an API request would be made to the database which returns the filtered candidates so all the browser does is render them.

4. If a recruiter typed quickly in the search box, what could go wrong with a naive implementation, and how would you address it?

In a naive implementation, each keystroke could trigger a new search, resulting in unnecessary filtering happening very quickly which can cause UI glitching and possibly the wrong results rendering. If this same mistake was made on a larger scale database as I mentioned above, it would cause many unnecessary API requests to happen rapidly which might result in rate limiting. I addressed this by adding a debounce function so that when the browser detects input, a delay can be set before the page is updated.

### Part 3

5. Where should the API key live in a real (production) deployment? Walk through your reasoning.

In a real production deployment the API key should be a server side environment variable, this way we can proxy through the backend and the key is never sent to the browser which is unsafe. In this case since we are using static HTML with no real backend we can use an api-config.local.js file to keep the key from being committed to the repo but it still is sent through the browser.

6. Suppose the API sometimes returns inconsistent data (missing fields, unexpected types). Describe your strategy for handling it — and what the user sees when it happens.

To handle inconsistent data sent from the API I validate the response shape and normalize each record in try/catch blocks so that one bad object won’t break the entire load. I also have fallbacks if data is empty so that the user sees something like “Summary unavailable” instead of just blank space.

7. If the AI service generating fitScore is slow (5–10 seconds), would you still block the page on it? Why or why not? Sketch an alternative.

No I would not block the page since a load time that long is significant. I would render the candidates immediately and have the fit score appear once available by fetching them asynchronously.

### Part 4 (Bonus — HR chat & AI product questions)

1. Trust and accuracy. LLMs occasionally produce incorrect or made-up information. For an HR tool, what UI or product decisions would you make to reduce the risk of users acting on a wrong answer? Give at least two concrete ideas.

- For every answer there should be some source of truth provided that the LLM is getting this answer from so that the user can check for accuracy. If there is an internal knowledge base this can easily be achievable with a RAG system. In the UI there can be clickable links to the source document so that users can quickly review them.
- The LLM should be strictly prompted so that it only answers questions that it is confident in or at least tells the user if it’s not 100% confident in its answer. This may seem like an immediate solution but can be very powerful especially when combined with tools like RAG.

2. Privacy. HR data may include salaries, performance reviews, and protected attributes. What rules would you set for what data the chatbot is allowed to send to the LLM? How would you enforce them in code, at a high level?

- I’d set a data minimization rule so that only data needed to answer the question is sent to LLM. In code this would look like authenticating users first and only giving the LLM data they are allowed to access. All sensitive data should be cleaned before ever reaching the LLM.
- If for some reason the LLM needs to have access to sensitive data I would look into local deployment. This would only be useful for more specific tasks since these models are smaller but would have no privacy risks since data would stay local.

3. Failure modes. Describe two ways this feature could go wrong in production that a generic chatbot wouldn't suffer from. For each, propose one mitigation.

- As already mentioned, the data for an HR chatbot like this can be highly sensitive and answers need to be fully trusted or else incorrect guidance could cause legal problems. Mitigations as mentioned would look like having answers grounded in truth that users can quickly review and being very careful with what data can be given to the LLM and having sensitive content cleaned before ever reaching it.
- Unlike a general purpose chatbot, this one needs to be tailored for each different HR team. If the system uses one generic prompt or the same data retrieval across all teams that could cause incorrect information retrieval or data leakage. This means the system needs to be built with team specific configurations and permissions.

4. Measurement. If you launched this feature, how would you tell whether it's actually helping HR teams — versus just being used? Suggest 2–3 signals you'd track and at least one you'd deliberately NOT optimize for.

- I think the biggest metric to keep track of would be time saved for the team. Measure how long each member would typically take on a task and compare it against how long it takes using this tool.
- Another metric that I would use is satisfaction of each answer with something like a thumbs up/down or a scoring system on messages. This can serve two purposes, directly keeping track of how often answers are actually useful and being able to see exactly where the tool is failing. By knowing which answers have been wrong you can go back and dissect what the issue is and fix it.
- I’d deliberately not optimize for a metric such as the amount of time the team is using the tool. If the team is spending a lot of time on the tool it could mean they love it or it could be they're spending all their time trying to find good answers, the metric is too vague. Best case scenario the team should get a useful answer quickly and use the tool as little as possible.

5. Pushback. A product manager asks you to add a feature that auto-rejects candidates whose fitScore is below 40, without HR review. Walk through how you'd respond — technically, ethically, and as a teammate.

- I’d push back at the idea because ethically I don’t think a single score that an LLM has created should decide whether a candidate is reviewed. As an alternative I’d suggest using the score as a way to prioritize certain applicants. Something interesting to look into would be keeping track of candidates that would be auto-rejected and comparing them against whether they were actually rejected by HR. If there is a strong enough correlation we could look into implementing something similar, but at the end of the day I believe every applicant should have the chance to be reviewed by a human.

## AI Usage

I wrote or decided myself:

- Visual hierarchy of candidate cards
- Debounce logic
- Filter logic
- Security choices (textContent, API key approach)
- Inconsitent data handling
_ Error handling
- Final UI/UX choices

Majority of the code was written by AI assistants using Cursor but was thoroughly reviewed every step of the way.