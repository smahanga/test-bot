# ☕ BrewMind Support Bot

A customer support chatbot for **BrewMind** — a fictional AI-powered smart coffee subscription service. Built as a target system for stress-testing with [SynthEvaluation](../synth-evaluation).

## Features

- **Chat Interface**: A polished web page where users can chat with "Beanbot"
- **API Endpoint**: A REST API that SynthEvaluation (or any tool) can call to test the bot
- **Knowledge Base**: Detailed product info about plans, pricing, Smart Brewer troubleshooting, account management
- **Safety Rules**: The bot is instructed to never leak internal info, never make up answers, and handle angry customers gracefully

## Deploy to Vercel

1. Push this code to a GitHub repo (`brewmind-bot`)
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → Import the repo
3. Add environment variable: `GOOGLE_API_KEY` = your Google AI Studio API key
4. (Optional) Add `GEMINI_MODEL` = `gemini-1.5-flash` (recommended default)
5. Click **Deploy**

Your bot will be live at `https://brewmind-bot.vercel.app`

## Connect to SynthEvaluation

Once deployed, use this URL in SynthEvaluation's **External API** bot option:

- **Endpoint URL**: `https://brewmind-bot.vercel.app/api/chat`
- **Format**: `Simple JSON` (or `OpenAI-compatible` — both work!)

## API Usage

```bash
# Simple format
curl -X POST https://brewmind-bot.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What plans do you offer?"}'

# OpenAI-compatible format
curl -X POST https://brewmind-bot.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "What plans do you offer?"}]}'
```

## Project Structure

```
brewmind-bot/
├── api/
│   └── chat.js        ← Bot brain + API endpoint (knowledge base lives here)
├── src/
│   ├── App.jsx        ← Chat interface
│   └── main.jsx       ← React entry point
├── index.html
├── package.json
├── vite.config.js
└── vercel.json
```

---

Built by Shraddha Mahangare · MSIS 549


## Google API Key Setup (Gemini Flash)

1. Go to Google AI Studio: https://aistudio.google.com/app/apikey
2. Create or select a Google Cloud project when prompted.
3. Click **Create API key** and copy the key value.
4. For local development, create a `.env.local` file in the project root:

```bash
GOOGLE_API_KEY=your_google_api_key_here
GEMINI_MODEL=gemini-1.5-flash
```

5. For Vercel deployment, add the same variables in **Project Settings → Environment Variables**.
6. Redeploy the app after setting variables.

> Note: If you still set `GEMINI_MODEL=gemini-flash-preview`, the API auto-maps it to a supported Flash model, checks available `generateContent` models, and falls back to other Flash variants if needed.

You can test the API locally after starting Vite/Vercel dev with:

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What plans do you offer?"}'
```


## Troubleshooting: 429 Quota Exceeded

If you see a `429 RESOURCE_EXHAUSTED` error:

1. Confirm billing/quota in Google AI Studio and Google Cloud.
2. Set `GEMINI_MODEL=gemini-1.5-flash` (recommended for broad availability).
3. Wait for the retry window (the API may return a `retryDelay`) and try again.
4. If you use Vercel, redeploy after environment variable changes.
