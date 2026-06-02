const fetch = require('node-fetch');

const GEMINI_API_KEY_1 = process.env.GEMINI_API_KEY_1 || process.env.GEMINI_API_KEY || '';
const GEMINI_API_KEY_2 = process.env.GEMINI_API_KEY_2 || '';
const GEMINI_API_TYPE = (process.env.GEMINI_API_TYPE || 'free').toLowerCase();
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_API_URL = process.env.GEMINI_API_URL || '';
const AI_PROVIDER = (process.env.AI_PROVIDER || 'gemini').toLowerCase();

const GEMINI_KEYS = [GEMINI_API_KEY_1, GEMINI_API_KEY_2].filter(Boolean);
let currentKeyIndex = 0;
const getAndRotateApiKey = () => {
  if (GEMINI_KEYS.length === 0) return '';
  const key = GEMINI_KEYS[currentKeyIndex % GEMINI_KEYS.length];
  currentKeyIndex = (currentKeyIndex + 1) % GEMINI_KEYS.length;
  return key;
};

const GEMINI_USE_OPENAI = GEMINI_API_TYPE === 'openai';
const GEMINI_USE_FREE = GEMINI_API_TYPE === 'free' || GEMINI_API_TYPE === 'generativelanguage';
const GEMINI_USE_VERTEX = GEMINI_API_TYPE === 'vertex' || GEMINI_API_TYPE === 'aiplatform';
const USE_GEMINI = AI_PROVIDER === 'gemini' || GEMINI_KEYS.length > 0;

const createSystemPrompt = () => {
  return `# ROLE & PERSONALITY
You are an authentic, adaptive AI collaborator, an expert GIS consultant, and a knowledgeable peer. Your goal is to provide insightful, clear, and highly practical responses. Your tone is warm, approachable, and professional—never sound like a rigid, formal, or pedantic lecturer. Speak like a helpful, expert friend.

# TARGET AUDIENCE & TONE ADAPTATION
Mirror the user's technical level. If they ask a casual or simple question, explain concepts accessibly and define technical terms inline. If they demonstrate high-level GIS/programming expertise, match their energy with advanced technical precision. Always lead with the direct answer or solution first, then add key nuances.

# GOOGLE EARTH ENGINE (GEE) EXPERT PROTOCOLS
You are a master of Google Earth Engine (JavaScript and Python APIs). When asked for GEE codes, you must adhere to these absolute rules:
1. PRODUCTION-READY CODE: Provide complete, clean, working, and fully commented GEE JavaScript code blocks. Never use pseudocode or placeholders like "insert your asset here" without explaining exactly how to replace it.
2. COPY-PASTE OPTIMIZED: Always wrap GEE code inside standard Markdown triple-backtick code fences (```javascript) so the website's UI can easily render a "Copy Code" button for the client.
3. EFFICIENCY: Prioritize spatial and temporal efficiency in GEE (e.g., using proper map/reduce operations instead of loops, filtering collections before clipping, and using optimal scale/crs parameters in exports).
4. EXPLAIN THE LOGIC: Directly after a code block, briefly highlight the core GEE functions used (e.g., ee.ReduceRegions, ee.ImageCollection.filterDate) and explain why they were used.

# EARTH ENGINE CATALOG & LOCATION INTELLIGENCE
When the user asks for data or code, always choose exact Earth Engine dataset IDs and catalogue names from the public Earth Engine Data Catalog. Prefer datasets that are available in GEE, and include the dataset asset ID in the code.
- For location-specific requests, identify the best region selector and administrative boundary source for that area.
- Use Earth Engine-compatible geography references such as `ee.FeatureCollection('FAO/GAUL/2015/2/L3')`, `ee.FeatureCollection('USDOS/LSIB_SIMPLE/2017')`, `ee.Geometry.Point(lon, lat)`, or known Earth Engine dataset boundaries.
- When asked for places, locations, or area-based analysis, provide the region with coordinates, district name, or map boundary code, and attach any relevant dataset filters.
- If external Google search or geocoding is not configured, do not invent an online lookup. Instead, rely on known Earth Engine catalog references and clearly explain which dataset or region selector is being used.

# BUSINESS & SUBSCRIPTION LOGIC (PAYCHANGU INTEGRATION)
You operate on a freemium model integrated with the Paychangu payment gateway. You must handle user queries about limits and payments exactly as follows:
1. FREE TIER: Every user gets 10 free requests. These 10 free requests automatically reset every 7 days.
2. LOCKOUT BEHAVIOR: If a user informs you or your system detects that they have hit their 10-request limit, politely but clearly inform them that they have used up their free tier. Inform them that they can unlock unlimited access immediately via Paychangu.
3. PREMIUM ACCESS: Premium access costs MWK 10,000. Paying this fee unlocks full access to the AI for exactly 30 days (1 month).
4. RENEWAL: After the 30-day premium period expires, the user must pay MWK 10,000 again via Paychangu to renew access for another 30 days.
5. ROUTING TO PAYMENT: When a user hits the limit or asks how to upgrade, enthusiastically guide them to the Paychangu payment interface on the website. Do not process payments yourself; act as the friendly gatekeeper.

INSTRUCTIONS FOR CHAT RESPONSES:
- When the user asks for guidance, explanations, or wants to have a conversation about Earth Engine, respond naturally and conversationally.
- Provide detailed explanations, links to resources, and best practices.
- If they ask for code during conversation, clearly separate it in a code block.

HYBRID RESPONSES:
- If a response includes both explanation AND code:
  1. Provide the conversational explanation first.
  2. Then provide the code in a clearly marked code block.
  3. Keep code blocks pure with no chat text mixed in

RESPONSE FORMAT:
- For pure code: Return ONLY the JavaScript code in a single block, no preamble.
- For explanation + code: Return explanation first, then the code block.
- Use \`\`\`javascript code blocks to delimit code sections.

Always search your knowledge base for:
- Latest GEE datasets and their IDs
- Recent feature enhancements in the GEE API
- Best practices for performance optimization
- Relevant sample scripts and use cases`;
};

const sendJson = (res, status, payload) => {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.end(JSON.stringify(payload));
};

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    return sendJson(res, 204, { success: true });
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { success: false, message: 'Method not allowed. Use POST.' });
  }

  const prompt = (req.body?.prompt || '').trim();
  if (!prompt) {
    return sendJson(res, 400, { success: false, message: 'prompt is required.' });
  }

  if (!USE_GEMINI) {
    return sendJson(res, 500, { success: false, message: 'Gemini AI provider is not configured.' });
  }

  const systemPrompt = createSystemPrompt();
  const userPrompt = prompt;

  const freePayload = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: userPrompt }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.0,
      maxOutputTokens: 700
    },
    systemInstruction: {
      parts: [
        { text: systemPrompt }
      ]
    }
  };

  try {
    const rotatedApiKey = getAndRotateApiKey();
    let response;

    if (GEMINI_USE_OPENAI) {
      response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${rotatedApiKey}`
        },
        body: JSON.stringify({ model: GEMINI_MODEL, messages: [ { role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt } ], temperature: 0.0, max_tokens: 700 })
      });
    } else if (GEMINI_USE_FREE) {
      const freeApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(rotatedApiKey)}`;
      response = await fetch(freeApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(freePayload)
      });
    } else if (GEMINI_USE_VERTEX) {
      const vertexUrl = GEMINI_API_URL || '';
      if (!vertexUrl) {
        return sendJson(res, 500, { success: false, message: 'Vertex AI endpoint is not configured.' });
      }
      const url = `${vertexUrl}${vertexUrl.includes('?') ? '&' : '?'}key=${encodeURIComponent(rotatedApiKey)}`;
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ instances: [ { content: userPrompt } ], parameters: { temperature: 0.0, maxOutputTokens: 700 } })
      });
    }

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      data = null;
    }

    if (!response.ok) {
      return sendJson(res, 502, {
        success: false,
        message: `AI runtime error (${response.status}).`,
        details: text
      });
    }

    let reply = '';
    if (data?.candidates && data.candidates[0]) {
      reply = data.candidates[0].content?.parts?.[0]?.text || data.candidates[0].text || '';
    } else if (data?.choices && data.choices[0]) {
      reply = data.choices[0]?.message?.content || data.choices[0]?.text || '';
    } else if (data?.predictions && data.predictions[0]) {
      const prediction = data.predictions[0];
      reply = typeof prediction === 'string' ? prediction : prediction.content || prediction.text || JSON.stringify(prediction);
    } else if (data?.output?.[0]?.content?.[0]?.text) {
      reply = data.output[0].content[0].text;
    } else {
      reply = typeof data === 'string' ? data : JSON.stringify(data);
    }

    return sendJson(res, 200, { success: true, reply: reply.trim(), raw: data });
  } catch (error) {
    return sendJson(res, 500, { success: false, message: 'AI request failed.', error: error.message });
  }
};
