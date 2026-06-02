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
  return `You are an expert Google Earth Engine (GEE) specialist and coding assistant. Your role is to provide comprehensive, production-ready Earth Engine JavaScript code with rich functionality.

INSTRUCTIONS FOR CODE RESPONSES:
- When the user asks for code or scripts, provide ONLY pure, runnable Earth Engine JavaScript code.
- Include complete scripts with all necessary imports, function definitions, and export statements.
- Use real GEE datasets from the public data catalog (e.g., ee.ImageCollection, ee.FeatureCollection).
- Include filtering by date, bounds, cloud cover, and other relevant parameters.
- Add comments explaining key steps and dataset choices.
- Wrap all code in a single JavaScript code block.
- DO NOT include conversational text, explanations, or chat words mixed with the code.

INSTRUCTIONS FOR CHAT RESPONSES:
- When the user asks for guidance, explanations, or wants to have a conversation about Earth Engine, respond naturally and conversationally.
- Provide detailed explanations, links to resources, and best practices.
- If they ask for code during conversation, clearly separate it in a code block.

HYBRID RESPONSES:
- If a response includes both explanation AND code:
  1. First provide the conversational explanation or context
  2. Then provide the code in a clearly marked code block
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
