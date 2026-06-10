# Let Me ChatGPT That For You

For all those people who find it more convenient to ask you than an AI.

Type the question they asked you, pick an AI (ChatGPT, Claude, Perplexity, Grok, Copilot, or Google AI Mode), get a link. When they open it, a fake cursor types the question into a fake chat box, presses Send, delivers one line of judgment, and redirects them to the real AI with the prompt prefilled.

## Stack

Plain static files. No frameworks, no build step, no dependencies.

- `index.html` — creator + playback modes in one page
- `style.css` — dark theme
- `app.js` — all logic
- `vercel.json` — `cleanUrls`

## Run

Open `index.html` in a browser, or deploy the folder to Vercel as-is.

## Notes

- The `q` param is capped at 2000 chars and only ever rendered via `textContent` (no HTML injection).
- Unknown `ai` values fall back to ChatGPT; empty `q` falls back to creator mode.
- Not affiliated with OpenAI, Anthropic, or anyone with lawyers.
