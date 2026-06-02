require('dotenv').config({ override: true });
const path = require('path');
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;
const PAYCHANGU_SECRET_KEY = process.env.PAYCHANGU_SECRET_KEY;
const AI_PROVIDER = (process.env.AI_PROVIDER || 'local').toLowerCase();
const LOCAL_AI_URL = process.env.LOCAL_AI_URL || 'http://127.0.0.1:8080';
const LOCAL_AI_MODEL = process.env.LOCAL_AI_MODEL || 'Salesforce/codegen-350M-multi';
const LOCAL_AI_API_KEY = process.env.LOCAL_AI_API_KEY || '';
const GEMINI_API_KEY_1 = process.env.GEMINI_API_KEY_1 || process.env.GEMINI_API_KEY || '';
const GEMINI_API_KEY_2 = process.env.GEMINI_API_KEY_2 || '';
const GEMINI_API_TYPE = (process.env.GEMINI_API_TYPE || 'free').toLowerCase();
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-mini';
const GEMINI_API_URL = process.env.GEMINI_API_URL || '';

const GEMINI_KEYS = [GEMINI_API_KEY_1, GEMINI_API_KEY_2].filter(Boolean);
let currentKeyIndex = 0;
const getAndRotateApiKey = () => {
  if (GEMINI_KEYS.length === 0) return '';
  const key = GEMINI_KEYS[currentKeyIndex % GEMINI_KEYS.length];
  currentKeyIndex = (currentKeyIndex + 1) % GEMINI_KEYS.length;
  return key;
};
const GEMINI_API_KEY = GEMINI_KEYS[0] || '';

const USE_GEMINI = AI_PROVIDER === 'gemini' || (GEMINI_KEYS.length > 0 && AI_PROVIDER !== 'local');
const GEMINI_USE_OPENAI = GEMINI_API_TYPE === 'openai';
const GEMINI_USE_FREE = GEMINI_API_TYPE === 'free' || GEMINI_API_TYPE === 'generativelanguage';
const GEMINI_USE_VERTEX = GEMINI_API_TYPE === 'vertex' || GEMINI_API_TYPE === 'aiplatform';
const ACTIVE_AI_PROVIDER = USE_GEMINI ? 'gemini' : 'local-ai';

console.log(`Using AI provider: ${ACTIVE_AI_PROVIDER}`);
if (USE_GEMINI) {
  if (GEMINI_USE_OPENAI) {
    console.log(`Using Gemini OpenAI-compatible endpoint`);
  } else if (GEMINI_USE_FREE) {
    console.log(`Using Google Gemini free API (generativelanguage.googleapis.com)`);
    console.log(`Using GEMINI_MODEL=${GEMINI_MODEL}`);
  } else if (GEMINI_USE_VERTEX) {
    console.log(`Using Google Vertex AI Platform endpoint`);
    console.log(`Using GEMINI_MODEL=${GEMINI_MODEL}`);
  }
} else {
  console.log(`Using LOCAL_AI_URL=${LOCAL_AI_URL}`);
  console.log(`Using LOCAL_AI_MODEL=${LOCAL_AI_MODEL}`);
}

if (!PAYCHANGU_SECRET_KEY) {
  console.warn('WARNING: PAYCHANGU_SECRET_KEY is not set. Please add it to your .env file.');
}

if (!LOCAL_AI_URL) {
  console.warn('WARNING: LOCAL_AI_URL is not set. Please add it to your .env file if you want the local AI chat feature to work.');
}

app.use(cors());
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));

// Serve the main website from the project root so frontend files can reach the backend
app.use(express.static(path.join(__dirname, '..')));

const paymentStatuses = new Map();

function savePaymentStatus(txRef, status, details = {}) {
  const record = {
    tx_ref: txRef,
    status,
    details,
    updatedAt: new Date().toISOString()
  };
  paymentStatuses.set(txRef, record);
  console.log(`Payment status updated for ${txRef}: ${status}`);
  return record;
}

function getPaymentStatus(txRef) {
  return paymentStatuses.get(txRef) || null;
}

app.get('/', (req, res) => {
  res.send('SKYLL TECH backend is running.');
});

const handleAIChat = async (req, res) => {
  const prompt = (req.body?.prompt || '').trim();
  if (!prompt) {
    return res.status(400).json({ success: false, message: 'prompt is required.' });
  }

  if (USE_GEMINI && !GEMINI_API_KEY_1 && !GEMINI_API_KEY_2) {
    return res.status(500).json({ success: false, message: 'Gemini API key is not configured.' });
  }

  if (!USE_GEMINI && !LOCAL_AI_URL) {
    return res.status(500).json({ success: false, message: 'Local AI backend URL is not configured.' });
  }

  const systemPrompt = 'You are an expert Google Earth Engine JavaScript assistant. Use the Google Earth Engine public data catalog and dataset IDs wherever relevant. When asked for code, reply with valid Google Earth Engine JavaScript only, using Earth Engine functions, correct collection names, and correct band names. Always return a complete runnable script. Do not return a single comment line. Do not add explanations, notes, or repeat the prompt. If a code snippet is requested, provide a ready-to-use GEE script with no extra text.';
  const userPrompt = 'Answer with pure Google Earth Engine JavaScript code only. Use the Earth Engine data catalog and dataset names where applicable. ' + prompt;
  const payload = {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.0,
    max_tokens: 700
  };

  try {
    let response;
    if (USE_GEMINI) {
      const rotatedApiKey = getAndRotateApiKey();
      if (GEMINI_USE_OPENAI) {
        console.log('Forwarding prompt to Gemini (OpenAI-style endpoint):', prompt);
        response = await fetch(GEMINI_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${rotatedApiKey}`
          },
          body: JSON.stringify({ model: GEMINI_MODEL, ...payload })
        });
      } else if (GEMINI_USE_FREE) {
        console.log('Forwarding prompt to Google Gemini free API:', prompt);
        const freeApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(rotatedApiKey)}`;
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
              { text: 'You are an expert Google Earth Engine JavaScript assistant. Use the Google Earth Engine public data catalog and dataset IDs wherever relevant. When asked for code, reply with valid Google Earth Engine JavaScript only, using Earth Engine functions, correct collection names, and correct band names. Always return a complete runnable script. Do not return a single comment line. Do not add explanations, notes, or repeat the prompt. If a code snippet is requested, provide a ready-to-use GEE script with no extra text.' }
            ]
          }
        };
        response = await fetch(freeApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(freePayload)
        });
      } else if (GEMINI_USE_VERTEX) {
        console.log('Forwarding prompt to Google Vertex AI Platform endpoint:', prompt);
        const vertexUrl = GEMINI_API_URL || 'https://us-central1-aiplatform.googleapis.com/v1/projects/gen-lang-client-0053620291/locations/us-central1/publishers/google/models/gemini-1.5-mini:predict';
        if (!vertexUrl) {
          return res.status(500).json({ success: false, message: 'Vertex AI endpoint is not configured. Set GEMINI_API_URL.' });
        }
        const baseUrl = vertexUrl.replace(/\/+$/, '');
        const url = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}key=${encodeURIComponent(rotatedApiKey)}`;
        const vertexPayload = {
          instances: [
            { content: prompt }
          ],
          parameters: {
            temperature: 0.2,
            maxOutputTokens: 500
          }
        };
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(vertexPayload)
        });
      }
    } else {
      console.log('Forwarding prompt to local AI:', prompt);
      response = await fetch(`${LOCAL_AI_URL.replace(/\/+$/, '')}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(LOCAL_AI_API_KEY ? { Authorization: `Bearer ${LOCAL_AI_API_KEY}` } : {})
        },
        body: JSON.stringify(payload)
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
      console.error('AI runtime error response:', response.status, text);
      return res.status(502).json({
        success: false,
        message: `AI runtime error (${response.status}).`,
        details: text
      });
    }

    let reply = '';
    if (data?.candidates && data.candidates[0]) {
      const candidate = data.candidates[0];
      reply = candidate.content?.parts?.[0]?.text || candidate.text || '';
    } else if (data?.choices && data.choices[0]) {
      reply = data.choices[0]?.message?.content || data.choices[0]?.text || '';
    } else if (data?.predictions && data.predictions[0]) {
      const prediction = data.predictions[0];
      reply = typeof prediction === 'string'
        ? prediction
        : prediction.content || prediction.text || JSON.stringify(prediction);
    } else if (data?.output?.[0]?.content?.[0]?.text) {
      reply = data.output[0].content[0].text;
    } else {
      reply = typeof data === 'string' ? data : JSON.stringify(data);
    }

    const trimmedReply = reply.trim();
    console.log('AI reply:', trimmedReply);
    return res.json({ success: true, reply: trimmedReply, raw: data });
  } catch (error) {
    console.error('AI request failed:', error);
    return res.status(500).json({ success: false, message: 'AI request failed.', error: error.message });
  }
};

app.post('/ai-chat', handleAIChat);
app.post('/local-ai-chat', handleAIChat);

app.post('/verify-paychangu', async (req, res) => {
  const { tx_ref, transaction } = req.body;

  if (!tx_ref) {
    return res.status(400).json({ success: false, message: 'tx_ref is required.' });
  }

  console.log(`Verifying transaction: tx_ref=${tx_ref}`);

  if (!PAYCHANGU_SECRET_KEY) {
    // If secret key is not set, record as pending and await webhook
    savePaymentStatus(tx_ref, 'pending', { note: 'No secret key for immediate verification, awaiting webhook' });
    return res.json({ success: false, status: 'pending', message: 'Backend verification unavailable, awaiting webhook.' });
  }

  try {
    const verifyUrl = 'https://api.paychangu.com/v1/transactions/verify';
    const payload = {
      tx_ref,
      transaction_id: transaction?.id || null,
      amount: transaction?.amount || null
    };

    console.log(`Making verification request to Paychangu:`, payload);

    const response = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${PAYCHANGU_SECRET_KEY}`
      },
      body: JSON.stringify(payload),
      timeout: 10000
    });

    const data = await response.json();
    console.log(`Paychangu API response:`, data);

    if (!response.ok) {
      console.warn(`Paychangu verification failed (HTTP ${response.status}):`, data);
      // Save as pending to wait for webhook
      savePaymentStatus(tx_ref, 'pending', data);
      return res.json({ success: false, status: 'pending', message: 'Verification pending via webhook.', details: data });
    }

    const isVerified = data?.status === 'success' || data?.data?.status === 'success';
    const status = isVerified
      ? 'verified'
      : (data?.status === 'failed' || data?.data?.status === 'failed')
        ? 'failed'
        : 'pending';
    
    savePaymentStatus(tx_ref, status, data);
    return res.json({ success: isVerified, status, data });
  } catch (error) {
    console.error('Paychangu verification error:', error);
    // On error, assume webhook will handle it
    savePaymentStatus(tx_ref, 'pending', { error: error.message });
    return res.json({ success: false, status: 'pending', message: 'Verification error, awaiting webhook.', error: error.message });
  }
});

app.get('/payment-status', (req, res) => {
  const tx_ref = req.query.tx_ref;
  if (!tx_ref) {
    return res.status(400).json({ success: false, message: 'tx_ref query parameter is required.' });
  }
  const record = getPaymentStatus(tx_ref);
  if (!record) {
    return res.status(404).json({ success: false, message: 'Payment status not found.', status: 'unknown' });
  }
  return res.json({ success: true, ...record });
});

// Test endpoint to simulate successful payment (for development only)
app.post('/test-payment-success', (req, res) => {
  const { tx_ref } = req.body;
  if (!tx_ref) {
    return res.status(400).json({ success: false, message: 'tx_ref is required.' });
  }
  savePaymentStatus(tx_ref, 'verified', { test: true, message: 'Test payment verified' });
  return res.json({ success: true, message: 'Test payment marked as verified.', tx_ref });
});

app.post('/paychangu-webhook', (req, res) => {
  const event = req.body || {};
  console.log('Paychangu webhook event received:', JSON.stringify(event, null, 2));

  const signature = req.header('x-paychangu-signature') || req.header('X-Paychangu-Signature');
  if (signature && PAYCHANGU_SECRET_KEY) {
    try {
      const computedSignature = crypto
        .createHmac('sha256', PAYCHANGU_SECRET_KEY)
        .update(req.rawBody || JSON.stringify(event))
        .digest('hex');

      if (computedSignature !== signature) {
        console.warn('Paychangu webhook signature mismatch');
        return res.status(400).json({ success: false, message: 'Invalid webhook signature.' });
      }
    } catch (error) {
      console.error('Webhook signature verification error:', error);
      return res.status(500).json({ success: false, message: 'Webhook verification failed.' });
    }
  }

  const txRef = event?.data?.tx_ref
    || event?.data?.transaction?.tx_ref
    || event?.data?.transaction?.reference
    || event?.data?.transaction?.id
    || event?.tx_ref
    || event?.transaction_id;

  // Check for success/failure in multiple possible locations
  const eventStatus = event?.data?.status || event?.status;
  const transactionStatus = event?.data?.transaction?.status;
  const isSuccess = eventStatus === 'success' 
    || event?.event === 'transaction.success' 
    || transactionStatus === 'success'
    || event?.data?.transaction?.successful === true;
  const isFailure = eventStatus === 'failed' 
    || event?.event === 'transaction.failed' 
    || transactionStatus === 'failed'
    || event?.data?.transaction?.successful === false;

  console.log(`Processing webhook for tx_ref=${txRef}, status=${eventStatus}, isSuccess=${isSuccess}, isFailure=${isFailure}`);

  if (txRef) {
    if (isSuccess) {
      console.log(`Webhook confirmed payment success for ${txRef}`);
      savePaymentStatus(txRef, 'verified', event);
    } else if (isFailure) {
      console.log(`Webhook confirmed payment failure for ${txRef}`);
      savePaymentStatus(txRef, 'failed', event);
    } else {
      console.log(`Webhook received pending status for ${txRef}`);
      savePaymentStatus(txRef, 'pending', event);
    }
  } else {
    console.warn('Webhook received without tx_ref; skipping payment-status update.');
  }

  return res.json({ success: true, message: 'Webhook received.' });
});

app.listen(PORT, () => {
  console.log(`Paychangu verification backend listening on http://localhost:${PORT}`);
});
