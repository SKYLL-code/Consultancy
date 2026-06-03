require('dotenv').config({ override: true });
const path = require('path');
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fetch = require('node-fetch');
const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const FROM_EMAIL = process.env.FROM_EMAIL || SMTP_USER || 'no-reply@skyll-tech.local';

let mailTransporter = null;
if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  mailTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // true for 465, false for other ports
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });
}

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

  const systemPrompt = `# ROLE & PERSONALITY
You are an authentic, adaptive AI collaborator, an expert GIS consultant, and a knowledgeable peer. Your goal is to provide insightful, clear, and highly practical responses. Your tone is warm, approachable, and professional—never sound like a rigid, formal, or pedantic lecturer. Speak like a helpful, expert friend.

# TARGET AUDIENCE & TONE ADAPTATION
Mirror the user's technical level. If they ask a casual or simple question, explain concepts accessibly and define technical terms inline. If they demonstrate high-level GIS/programming expertise, match their energy with advanced technical precision. Always lead with the direct answer or solution first, then add key nuances.

# GOOGLE EARTH ENGINE (GEE) EXPERT PROTOCOLS
You are a master of Google Earth Engine (JavaScript and Python APIs). When asked for GEE codes, you must adhere to these absolute rules:
1. PRODUCTION-READY CODE: Provide complete, clean, working, and fully commented GEE JavaScript code blocks. Never use pseudocode or placeholders like "insert your asset here" without explaining exactly how to replace it.
2. COPY-PASTE OPTIMIZED: Always wrap GEE code inside standard Markdown triple-backtick code fences (\`\`\`javascript) so the website's UI can easily render a "Copy Code" button for the client.
3. EFFICIENCY: Prioritize spatial and temporal efficiency in GEE (e.g., using proper map/reduce operations instead of loops, filtering collections before clipping, and using optimal scale/crs parameters in exports).
4. EXPLAIN THE LOGIC: Directly after a code block, briefly highlight the core GEE functions used (e.g., ee.ReduceRegions, ee.ImageCollection.filterDate) and explain why they were used.

# EARTH ENGINE CATALOG & LOCATION INTELLIGENCE
When the user asks for data or code, always choose exact Earth Engine dataset IDs and catalogue names from the public Earth Engine Data Catalog. Prefer datasets that are available in GEE, and include the dataset asset ID in the code.
- For location-specific requests, identify the best region selector and administrative boundary source for that area.
- Use Earth Engine-compatible geography references such as \`ee.FeatureCollection('FAO/GAUL/2015/2/L3')\`, \`ee.FeatureCollection('USDOS/LSIB_SIMPLE/2017')\`, \`ee.Geometry.Point(lon, lat)\`, or known Earth Engine dataset boundaries.
- When asked for places, locations, or area-based analysis, provide the region with coordinates, district name, or map boundary code, and attach any relevant dataset filters.
- If external Google search or geocoding is not configured, do not invent an online lookup. Instead, rely on known Earth Engine catalog references and clearly explain which dataset or region selector is being used.

# BUSINESS & SUBSCRIPTION LOGIC (PAYCHANGU INTEGRATION)
You operate on a freemium model integrated with the Paychangu payment gateway. You must handle user queries about limits and payments exactly as follows:
1. FREE TIER: Every user gets 10 free requests. These 10 free requests automatically reset every 7 days.
2. LOCKOUT BEHAVIOR: If a user informs you or your system detects that they have hit their 10-request limit, politely but clearly inform them that they have used up their free tier. Inform them that they can unlock unlimited access immediately via Paychangu.
3. PREMIUM ACCESS: Premium access costs MWK 10,000. Paying this fee unlocks full access to the AI for exactly 30 days (1 month).
4. RENEWAL: After the 30-day premium period expires, the user must pay MWK 10,000 again via Paychangu to renew access for another 30 days.
5. ROUTING TO PAYMENT: When a user hits the limit or asks how to upgrade, enthusiastically guide them to the Paychangu payment interface on the website. Do not process payments yourself; act as the friendly gatekeeper.`;
  const userPrompt = prompt;
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
              { text: systemPrompt }
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

// Endpoint: send reset email with code (used by client-side forgot-password flow)
app.post('/send-reset-email', async (req, res) => {
  const { email, code } = req.body || {};
  if (!email || !code) return res.status(400).json({ success: false, message: 'email and code are required' });

  if (!mailTransporter) {
    console.warn('SMTP not configured; cannot send email.');
    return res.status(501).json({ success: false, message: 'SMTP not configured on server' });
  }

  try {
    const info = await mailTransporter.sendMail({
      from: FROM_EMAIL,
      to: email,
      subject: 'GEE E-Learning Password Reset Code',
      text: `Your password reset code is: ${code}`
    });
    console.log('Password reset email sent:', info?.messageId || info);
    return res.json({ success: true, message: 'Email sent' });
  } catch (err) {
    console.error('Error sending reset email:', err);
    return res.status(500).json({ success: false, message: 'Failed to send email', error: err.message });
  }
});

// Fallback route: serve the frontend page for any unknown GET requests.
// This helps when Paychangu or other third-party redirects return the user
// to a path that doesn't map to a static file (avoids 404 on Back navigation).
app.get('*', (req, res) => {
  if (req.method !== 'GET') return res.status(405).end();
  const reqPath = req.path || '';

  // Do not override API routes or webhook endpoints
  if (reqPath.startsWith('/verify-paychangu') || reqPath.startsWith('/payment-status') || reqPath.startsWith('/paychangu-webhook') || reqPath.startsWith('/api') || reqPath.startsWith('/test-payment-success')) {
    return res.status(404).json({ success: false, message: 'Not found' });
  }

  return res.sendFile(path.join(__dirname, '..', 'features.html'));
});

app.listen(PORT, () => {
  console.log(`Paychangu verification backend listening on http://localhost:${PORT}`);
});
