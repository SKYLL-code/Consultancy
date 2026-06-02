# Deploying AI Backend to Vercel

This guide will help you deploy the SKYLL TECH AI backend to Vercel so your GitHub Pages website can access it.

## Prerequisites

- A Vercel account (sign up at https://vercel.com)
- Vercel CLI installed (`npm install -g vercel`)
- Your Gemini API keys ready

## Deployment Steps

### 1. Deploy to Vercel

From the `server/` directory:

```bash
cd server
npx vercel
```

The CLI will prompt you to:
- Connect to your Vercel account
- Select a project name (e.g., `skylltech-gee-ai-backend`)
- Confirm the root directory (use default)

After deployment, Vercel will provide your backend URL, e.g.:
```
https://skylltech-gee-ai-backend.vercel.app
```

### 2. Set Environment Variables on Vercel

In the Vercel dashboard:
1. Go to your project → **Settings** → **Environment Variables**
2. Add the following secrets:
   - `GEMINI_API_KEY_1`: Your first Gemini API key
   - `GEMINI_API_KEY_2`: Your second Gemini API key (optional, for rotation)
   - `GEMINI_API_TYPE`: `free` (or `vertex` / `openai` if applicable)
   - `GEMINI_MODEL`: `gemini-2.5-flash`
   - `AI_PROVIDER`: `gemini`

Or use the CLI:
```bash
npx vercel env add GEMINI_API_KEY_1
npx vercel env add GEMINI_API_KEY_2
```

### 3. Update Frontend URL

In `features.html`, replace the placeholder:

```javascript
const VERCEL_BACKEND_URL = 'https://skylltech-gee-ai-backend.vercel.app';
```

### 4. Test the Backend

Visit your Vercel URL directly:
```
https://skylltech-gee-ai-backend.vercel.app/api/ai-chat
```

Or test with a POST request:
```bash
curl -X POST https://skylltech-gee-ai-backend.vercel.app/api/ai-chat \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Write a short Earth Engine NDVI script"}'
```

### 5. Deploy Frontend Changes

Commit and push the updated `features.html` to GitHub:
```bash
git add features.html
git commit -m "Update backend URL to Vercel production endpoint"
git push origin main
```

GitHub Pages will automatically rebuild with the new backend URL.

### 6. Test the Full Integration

1. Visit your GitHub Pages website (e.g., `https://skyll-code.github.io/Consultancy`)
2. Click "Customize with AI"
3. Ask the AI for a GEE script
4. Verify the response appears in the chat

## Troubleshooting

### 429 Quota Exceeded Errors

If you see quota errors from Gemini:
- Check that `GEMINI_API_KEY_1` and `GEMINI_API_KEY_2` are properly set on Vercel
- Ensure each key is from a different Google Cloud project (to increase quotas)
- Wait a few moments if you've exceeded per-minute limits

### CORS Errors

The backend includes CORS headers. If you still see CORS issues:
- Verify the Vercel URL is correctly set in `features.html`
- Check browser console for the exact error message
- Confirm the backend is responding with `Access-Control-Allow-Origin: *`

### Backend Not Responding

- Test the Vercel URL directly with curl
- Check Vercel function logs: https://vercel.com → Your Project → **Deployments** → **Runtime Logs**
- Verify environment variables are set on Vercel Dashboard

## Redeploying Updates

When you update `server/index.js` or the backend code:

```bash
cd server
npx vercel --prod
```

The `--prod` flag forces a production redeployment.

---

For more info: https://vercel.com/docs
