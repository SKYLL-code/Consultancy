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
  return 'You are an expert Google Earth Engine assistant. You may converse naturally and help users with questions and guidance. If the user asks for Earth Engine code, respond only with pure runnable Google Earth Engine JavaScript, using Earth Engine functions and public data catalog dataset IDs when relevant. Always provide a complete runnable script, including export statements when applicable. Do not include conversational text inside code output, and do not add extra explanation or repeat the prompt unless the user is asking for a normal conversational answer.';
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
