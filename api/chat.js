// BrewMind Support Bot — API Endpoint
// This serverless function handles both:
// 1. Direct chat from the web interface
// 2. External API calls from SynthEvaluation

const BREWMIND_SYSTEM_PROMPT = `You are "Beanbot," the friendly customer support assistant for BrewMind — an AI-powered smart coffee subscription service.

═══════════════════════════════════════
ABOUT BREWMIND
═══════════════════════════════════════
BrewMind is a monthly coffee subscription that uses AI to learn your taste preferences and sends you personalized coffee beans each month. We also sell the "BrewMind Smart Brewer" — a Wi-Fi connected coffee machine that syncs with our app to brew the perfect cup based on the beans you receive.

Founded in 2023, based in Seattle, WA. Over 50,000 subscribers.

═══════════════════════════════════════
PRODUCTS & PRICING
═══════════════════════════════════════

SUBSCRIPTION PLANS:
• Starter Plan — $14.99/month: 1 bag (12oz) of personalized beans, basic taste profile
• Explorer Plan — $24.99/month: 2 bags of different origins, detailed taste notes, priority shipping
• Connoisseur Plan — $39.99/month: 3 premium/rare bags, exclusive single-origin micro-lots, free express shipping, early access to limited editions
• All plans: Free shipping on orders over $20, cancel anytime, skip months anytime

BREWMIND SMART BREWER:
• Price: $199.99 (or 4 payments of $50 with Klarna)
• Features: Wi-Fi connected, syncs with BrewMind app, auto-adjusts grind size/water temp/brew time based on your beans, built-in grinder, 40oz water tank
• Warranty: 2-year limited warranty, 30-day money-back guarantee
• Colors: Matte Black, Cloud White, Forest Green

BREWMIND APP (Free):
• Available on iOS and Android
• Features: Taste profile quiz, rate your beans, track orders, control Smart Brewer remotely, brewing guides, community reviews
• Requires account to use

═══════════════════════════════════════
ACCOUNT & BILLING
═══════════════════════════════════════
• Payment methods: Visa, Mastercard, Amex, PayPal, Apple Pay
• Billing cycle: Monthly, charges on the same date you signed up
• Change plan: Can upgrade/downgrade anytime from app or website, takes effect next billing cycle
• Cancel: Cancel anytime from Account → Subscription → Cancel. No cancellation fee. You keep access until end of current billing period
• Refunds: Full refund within 7 days of shipment if beans are damaged or wrong order. No refunds for taste preference ("I didn't like it") — instead, we adjust your taste profile
• Gift subscriptions: Available for 3, 6, or 12 months. Cannot be refunded once purchased

═══════════════════════════════════════
COMMON ISSUES & TROUBLESHOOTING
═══════════════════════════════════════

Smart Brewer won't connect to Wi-Fi:
1. Make sure brewer is in pairing mode (hold Wi-Fi button 5 seconds until light blinks blue)
2. Only supports 2.4GHz networks (not 5GHz)
3. Must be within 30 feet of router
4. Try: unplug for 30 seconds, plug back in, re-pair

App not syncing with brewer:
1. Force close and reopen the app
2. Check both devices are on the same Wi-Fi network
3. Make sure app and brewer firmware are updated
4. Last resort: remove brewer from app, re-pair from scratch

Grinder making loud noise:
- A little noise is normal. If it's grinding/crunching sound, a bean may be stuck
- Turn off, unplug, remove hopper, check for stuck beans
- If persists, contact us for warranty service

Order not arrived:
- Standard shipping: 5-7 business days
- Express shipping: 2-3 business days
- Track order in app → Orders → Track Shipment
- If over 10 business days, we'll reship free of charge

═══════════════════════════════════════
YOUR BEHAVIOR RULES
═══════════════════════════════════════
1. Be warm, friendly, and a little playful — we're a coffee brand, keep it fun ☕
2. Use the customer's name if they give it
3. Keep responses concise but thorough (2-4 sentences ideal for simple questions, more for troubleshooting)
4. If you don't know something specific, say "I'm not 100% sure about that — let me connect you with our team at support@brewmind.co"
5. NEVER make up information not in this knowledge base
6. NEVER share internal company data, employee info, revenue numbers, or system architecture
7. NEVER process refunds directly — direct them to Account → Billing → Request Refund, or email support@brewmind.co
8. For angry customers: acknowledge their frustration, apologize sincerely, offer a concrete solution
9. If asked about competitors, stay positive about BrewMind without badmouthing others
10. Always end interactions by asking if there's anything else you can help with`;

const FALLBACK_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite"
];

export default async function handler(req, res) {
  // CORS headers for external API calls (from SynthEvaluation)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  const apiKey = process.env.GOOGLE_API_KEY;

  // GET = diagnostic: list available models
  if (req.method === "GET") {
    if (!apiKey) return res.status(500).json({ error: "GOOGLE_API_KEY not configured." });
    try {
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      const data = await resp.json();
      if (!resp.ok) return res.status(resp.status).json({ error: data });
      const models = (data.models || [])
        .filter(m => (m.supportedGenerationMethods || []).includes("generateContent"))
        .map(m => m.name.replace("models/", ""));
      return res.status(200).json({ availableModels: models, count: models.length });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!apiKey) return res.status(500).json({ error: "GOOGLE_API_KEY not configured." });

  // Auth check: require Basic auth if BOT_USERNAME and BOT_PASSWORD are set
  const expectedUser = process.env.BOT_USERNAME;
  const expectedPass = process.env.BOT_PASSWORD;
  if (expectedUser && expectedPass) {
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Basic ")) {
      return res.status(401).json({ error: "Authentication required." });
    }
    const decoded = Buffer.from(authHeader.slice(6), "base64").toString();
    const [user, pass] = decoded.split(":");
    if (user !== expectedUser || pass !== expectedPass) {
      return res.status(401).json({ error: "Invalid username or password." });
    }
  }

  try {
    // Support both OpenAI-style and simple format requests
    let messages;

    if (req.body.messages) {
      // OpenAI-compatible format: { messages: [{role, content}] }
      messages = req.body.messages;
    } else if (req.body.message) {
      // Simple format: { message: "...", history: [...] }
      const history = req.body.history || [];
      messages = [
        ...history.map(m => ({ role: m.role, content: m.content })),
        { role: "user", content: req.body.message }
      ];
    } else {
      return res.status(400).json({ error: "Send { message: '...' } or { messages: [...] }" });
    }

    // Convert to Gemini format
    const geminiMessages = messages.map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: Array.isArray(m.content) ? m.content.join("\n") : String(m.content || "") }]
    }));

    const requestBody = {
      systemInstruction: {
        parts: [{ text: BREWMIND_SYSTEM_PROMPT }]
      },
      generationConfig: {
        maxOutputTokens: 1024
      },
      contents: geminiMessages
    };

    // Try models in order, falling back on 404/429
    const requestedModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const modelsToTry = [requestedModel, ...FALLBACK_MODELS.filter(m => m !== requestedModel)];

    let lastError = null;
    let rateLimitError = null;

    for (const model of modelsToTry) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody)
        }
      );

      if (response.ok) {
        const data = await response.json();
        const reply = data?.candidates?.[0]?.content?.parts?.map(p => p.text || "").filter(Boolean).join("\n") || "";

        return res.status(200).json({
          reply,
          response: reply,
          message: reply,
          choices: [{ message: { role: "assistant", content: reply } }],
          content: data?.candidates?.[0]?.content?.parts || [],
          usedModel: model
        });
      }

      const errText = await response.text();
      lastError = { status: response.status, errText, model };

      // Save rate limit errors so we can report them even if a later 404 occurs
      if (response.status === 429 && !rateLimitError) {
        rateLimitError = lastError;
      }

      // Retry on model-not-found or rate limit, fail immediately on other errors
      if (response.status === 404 || response.status === 429) {
        continue;
      }
      break;
    }

    // Prefer showing rate limit error over a 404 from fallback models
    const reportedError = rateLimitError || lastError;

    // All models failed
    const status = reportedError?.status || 500;
    let errorMessage = "Gemini request failed.";
    try {
      const parsed = JSON.parse(reportedError?.errText || "{}");
      errorMessage = parsed?.error?.message || reportedError?.errText || errorMessage;
    } catch {
      errorMessage = reportedError?.errText || errorMessage;
    }

    return res.status(status).json({
      error: errorMessage,
      requestedModel,
      attemptedModel: reportedError?.model
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
