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
3. Add environment variable: `ANTHROPIC_API_KEY` = your key
4. Click **Deploy**

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
