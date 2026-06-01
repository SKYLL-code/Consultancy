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
4. Start the backend server:
   ```bash
   npm start
   ```

The frontend checkout in `scripts.js` now sends payment success data to `/verify-paychangu` and only unlocks premium codes after the backend confirms the transaction.

> Note: In development, the backend should run on the same host or be proxied so the frontend can reach `/verify-paychangu`.

If you prefer another hosting provider (Netlify, Vercel), simply drag-and-drop the folder or connect the repo.
Want help customizing content, colors, or adding a logo and deployment steps? Reply with your company name, phone number for WhatsApp, Facebook page URL, and preferred colours.
