require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;
const PAYCHANGU_SECRET_KEY = process.env.PAYCHANGU_SECRET_KEY;

if (!PAYCHANGU_SECRET_KEY) {
  console.warn('WARNING: PAYCHANGU_SECRET_KEY is not set. Please add it to your .env file.');
}

app.use(cors());
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));

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
  res.send('SKYLL TECH Paychangu verification backend is running.');
});

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
    || event?.data?.transaction?.id;

  const isSuccess = event?.data?.status === 'success' || event?.event === 'transaction.success';
  const isFailure = event?.data?.status === 'failed' || event?.event === 'transaction.failed';

  if (txRef) {
    if (isSuccess) {
      savePaymentStatus(txRef, 'verified', event);
    } else if (isFailure) {
      savePaymentStatus(txRef, 'failed', event);
    } else {
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
