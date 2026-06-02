# SKYLL TECH — Website

This is a minimal static site scaffold for SKYLL TECH consultancy (GIS, statistical analysis, academic support).

Quick start:

1. Open `index.html` in your browser, or serve the folder with a simple static server:

```bash
# from this folder
python -m http.server 8000
# then open http://localhost:8000
```

2. Replace the placeholder contact links in `index.html` (Facebook URL, WhatsApp phone number, email address).
3. Replace the brand name, logo and copy as needed.5. The services section now links each service name to its own page. Check the `services/` folder:
   - `gis.html`
   - `remote-sensing.html`
   - `statistics.html`
   - `eia.html`
   - `sustainability.html`
   - `academic-support.html`
   Each contains more detailed information; feel free to edit.
6. Icons for social/contact links are provided via Font Awesome (although the current version uses text only). You can modify these links in `index.html`.

## Deployment to GitHub Pages

To make this site public, follow these steps (requires Git installed locally):

1. Create a new repository on GitHub named `skyll-tech` (or your choice).
2. In the project folder run:
   ```bash
   git init
   git add .
   git commit -m "Initial SKYLL TECH website"
   git branch -M main
   git remote add origin https://github.com/<your-username>/skyll-tech.git
   git push -u origin main
   ```
3. In the GitHub repo settings, enable **Pages** and set the source branch to `main` (or `gh-pages`). GitHub will publish the content under `https://<your-username>.github.io/skyll-tech/`.

Once pushed, any changes you make locally can be committed and pushed again to update the live site.

## Paychangu backend verification setup

This project includes a small backend endpoint for secure Paychangu payment verification.

1. Install backend dependencies:
   ```bash
   cd server
   npm install
   ```
2. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
3. Open `server/.env` and set your Paychangu secret key:
   ```env
   PAYCHANGU_SECRET_KEY=sk_test_your_secret_key_here
   PORT=3000
   ```
4. (Optional) Configure the AI provider if you want the "Customize with AI" feature to work:
   ```env
   AI_PROVIDER=gemini
   GEMINI_API_TYPE=google
   GEMINI_API_KEY=your_gemini_api_key_here
   GEMINI_PROJECT_ID=your-google-cloud-project-id
   GEMINI_LOCATION=us-central1
   GEMINI_MODEL=gemini-1.5-mini
   ```
   Or use a local runtime instead:
   ```env
   AI_PROVIDER=local
   LOCAL_AI_URL=http://127.0.0.1:8080
   LOCAL_AI_MODEL=Salesforce/codegen-350M-multi
   LOCAL_AI_API_KEY=
   ```
   If you want to override the full Google endpoint directly, set:
   ```env
   GEMINI_API_URL=https://us-central1-aiplatform.googleapis.com/v1/projects/PROJECT_ID/locations/us-central1/publishers/google/models/gemini-1.5-mini:predict
   ```
5. Start the backend server:
   ```bash
   npm start
   ```

6. Open the feature page from the backend server:
   ```bash
   open http://localhost:3000/features.html
   ```

The frontend checkout in `scripts.js` now sends payment success data to `/verify-paychangu` and only unlocks premium codes after the backend confirms the transaction.

### Local AI chat setup for Customize with AI

The AI chat feature in `features.html` uses the backend route `POST /ai-chat`.
That route forwards prompts to Gemini cloud when `AI_PROVIDER=gemini` is configured, or to a local AI runtime when `AI_PROVIDER=local` is configured.

To run the Python-based local AI runtime in this project:
1. Open a terminal and change into the server folder:
   ```powershell
   cd server
   ```
2. Create and activate a virtual environment if needed:
   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```
3. Install runtime dependencies:
   ```powershell
   pip install -r requirements.txt
   ```
4. Start the local AI server:
   ```powershell
   npm run local-ai
   ```
5. Confirm the runtime is available:
   ```powershell
   Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8080/
   ```
6. Start the Node backend from the project root:
   ```powershell
   npm start
   ```

Set `LOCAL_AI_URL=http://127.0.0.1:8080` and `LOCAL_AI_MODEL=Salesforce/codegen-350M-multi` in `server/.env` for a stronger code-oriented local chat response.
If you use a LocalAI-style runtime instead, set `LOCAL_AI_MODEL` to the compatible model name supported by that runtime.

Recommended local model options:
- `Salesforce/codegen-350M-multi` — a compact code model that works well for JavaScript and Earth Engine snippets on CPU
- `Salesforce/codegen-2B-multi` — stronger if you have a GPU and more RAM
- `TheBloke/WizardLM-7B` or `meta-llama/Llama-2-7b-chat` via LocalAI if you want a much more capable instruction model

If you want the best local setup, use `Salesforce/codegen-350M-multi` first and then upgrade later.

A typical local AI setup would be:
1. Install and run the local model runtime on your PC or server.
2. Point `LOCAL_AI_URL` to its API endpoint.
3. Use `LOCAL_AI_MODEL` to select the model name supported by that runtime.

If you need help choosing or installing a local runtime, I can add exact config instructions for `LocalAI` or `text-generation-webui`.

> Note: The AI backend must be accessible to the website, and the frontend should remain browser-safe by never storing the AI service key in client code.

> Note: In development, the backend should run on the same host or be proxied so the frontend can reach `/verify-paychangu` and `/local-ai-chat`.

If you prefer another hosting provider (Netlify, Vercel), simply drag-and-drop the folder or connect the repo.
Want help customizing content, colors, or adding a logo and deployment steps? Reply with your company name, phone number for WhatsApp, Facebook page URL, and preferred colours.
