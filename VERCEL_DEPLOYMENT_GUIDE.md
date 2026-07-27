# 🚀 Minesweeper — Vercel Deployment Guide

This guide walks you through deploying this Minesweeper game to **Vercel** so anyone can play it on any device (phone, tablet, desktop).

## 📋 Prerequisites

- A **GitHub** account (free) — [Sign up here](https://github.com/signup)
- A **Vercel** account (free) — [Sign up here](https://vercel.com/signup)
- **Git** installed on your computer — [Download Git](https://git-scm.com/downloads)
- A code editor (VS Code recommended — you already have it!)

---

## 🔧 Step 1: Prepare the Project for Static Hosting

The current project uses Flask (a Python server) but all the game logic runs in the browser. We'll convert it to a **pure static site** that Vercel can serve directly.

### 1.1 — Convert `templates/landing.html` → static HTML

Open `templates/landing.html` and make these replacements:

| Find | Replace with |
|------|-------------|
| `{{ url_for('static', filename='css/style.css') }}?v=3` | `static/css/style.css?v=3` |
| `{{ url_for('static', filename='css/landing.css') }}?v=1` | `static/css/landing.css?v=1` |
| `{{ url_for('static', filename='js/auth.js') }}` | `./static/js/auth.js` |

> **⚠️ CRITICAL:** The `import Auth from` line must use `./static/js/auth.js` (with the `./` prefix). Without it, the browser cannot resolve the path and the entire login page breaks!

### 1.2 — Convert `templates/index.html` → static HTML

Open `templates/index.html` and make these replacements:

| Find | Replace with |
|------|-------------|
| `{{ url_for('static', filename='css/style.css') }}?v=4` | `static/css/style.css?v=4` |
| `{{ url_for('static', filename='js/game.js') }}?v=4` | `./static/js/game.js?v=4` |

> **⚠️ CRITICAL:** The script `src` must use `./static/js/game.js` (with the `./` prefix). Without it, the browser won't load the game JavaScript!

### 1.3 — Move HTML files to the root

Move (or copy) the template files to the project root and rename them:

```
Move:  templates/landing.html  →  landing.html  (project root)
Move:  templates/index.html    →  index.html     (project root)
```

> **Note:** After moving, `landing.html` and `index.html` should be in `c:/Users/aldre/Minesweeper/` (same folder as `static/`, `app.py`, etc.)

### 1.4 — Configure `vercel.json`

Create (or replace) `vercel.json` in the project root with this content:

```json
{
  "version": 2,
  "buildCommand": null,
  "outputDirectory": ".",
  "routes": [
    { "src": "^/static/(.*)", "dest": "/static/$1" },
    { "src": "^/game$", "dest": "/index.html" },
    { "src": "^/(.*)", "dest": "/landing.html" }
  ]
}
```

**What this does:**
- `/static/*` — serves all CSS, JS, images, and audio files
- `/game` — serves the actual game page
- `/` and all other paths — serves the landing/login page

### 1.5 — (Optional) Delete unnecessary files

These files are **no longer needed** since we removed Flask:

- `app.py` — Flask server (not used on Vercel)
- `requirements.txt` — Python dependencies (not used on Vercel)
- `templates/` folder — we moved the HTML files to root
- `venv/` — local Python virtual environment
- `c` — (if this is an extra file)

> ⚠️ **Don't delete these**: `static/` folder (contains all JS, CSS, images, audio)

---

## 📦 Step 2: Upload to GitHub

### 2.1 — Create a new GitHub repository

1. Go to [https://github.com/new](https://github.com/new)
2. Repository name: `minesweeper` (or any name you like)
3. Set visibility to **Public** (free hosting)
4. Click **"Create repository"**

### 2.2 — Push your code to GitHub

Open a terminal (Command Prompt, PowerShell, or VS Code terminal) and run:

```bash
# Navigate to your project folder
cd c:/Users/aldre/Minesweeper

# Initialize Git (if not already done)
git init

# Add all files
git add .

# Commit the files
git commit -m "Initial commit — Minesweeper game"

# Add your GitHub repository as remote
git remote add origin https://github.com/YOUR_USERNAME/minesweeper.git

# Push to GitHub
git branch -M main
git push -u origin main
```

> **Replace `YOUR_USERNAME`** with your actual GitHub username.

---

## 🚀 Step 3: Deploy on Vercel

### 3.1 — Connect Vercel to GitHub

1. Go to [https://vercel.com/new](https://vercel.com/new)
2. Click **"Continue with GitHub"**
3. Authorize Vercel to access your GitHub account
4. You'll see a list of your repositories

### 3.2 — Import your repository

1. Find and click **"Import"** on your `minesweeper` repository
2. In the configuration screen:
   - **Framework Preset**: Select **"Other"**
   - **Root Directory**: Keep default (`.`)
   - **Build Command**: Leave **empty**
   - **Output Directory**: Leave **empty**
3. Click **"Deploy"**

### 3.3 — Wait for deployment

- Vercel will analyze your project and deploy it (takes ~30 seconds)
- You'll see a **"Congratulations!"** screen
- Your site URL will be something like: `https://minesweeper-xxxxx.vercel.app`

---

## 🌐 Step 4: Configure Custom Domain (Optional)

By default, Vercel gives you a free `.vercel.app` domain. You can add a custom domain:

1. In your Vercel project dashboard, go to **"Settings" → "Domains"**
2. Enter your domain (e.g., `minesweeper.com`)
3. Follow Vercel's DNS configuration instructions

---

## 📱 What Works on Mobile

Since the game is already designed with responsive CSS:

✅ Touch-friendly controls (tap to reveal, tap to flag)  
✅ Responsive board sizing (adapts to any screen)  
✅ Mobile viewport meta tags  
✅ Flag toggle button for touch devices  

---

## 🛠️ Troubleshooting

### "Page not found" or blank screen
- Make sure `landing.html` and `index.html` exist in the **project root** (not inside `templates/`)
- Check that `vercel.json` is in the project root with the correct routes
- Redeploy by pushing a new commit to GitHub

### Static assets not loading (CSS/JS broken)
- Open browser DevTools (F12) → Network tab
- Check if files like `static/css/style.css` return 404
- Verify file paths match between HTML and actual file structure

### "Module not found" errors in console
- Check that `type="module"` is present in script tags
- Make sure all JS files exist in `static/js/`

### Game not loading / redirected to landing
- The game requires login (stored in browser localStorage)
- Register a new account on the landing page
- After login, you'll be redirected to `/game`

### "User not logged in" error
- Clear your browser's localStorage for the site
- Register and login again

---

## 🔄 How to Update Your Game

1. Make changes to files locally
2. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Description of changes"
   git push
   ```
3. Vercel **automatically redeploys** when you push to GitHub!

---

## 📁 Final Project Structure (after conversion)

```
minesweeper/
├── landing.html          ← Login/Landing page
├── index.html            ← Game page
├── vercel.json           ← Vercel configuration
├── static/
│   ├── css/
│   │   ├── style.css     ← Game styles
│   │   └── landing.css   ← Landing page styles
│   ├── js/
│   │   ├── auth.js       ← Authentication (localStorage)
│   │   ├── game.js       ← Main game logic
│   │   ├── board.js      ← Board class
│   │   ├── cell.js       ← Cell class
│   │   ├── renderer.js   ← Visual rendering
│   │   ├── timer.js      ← Game timer
│   │   └── audio.js      ← Sound effects (Web Audio)
│   ├── images/
│   └── audio/
├── README.md
└── LICENSE
```

---

## 🎉 Done!

Your Minesweeper game is now live on Vercel. Share the URL with anyone and they can play on any device!

**Typical Vercel URL format:** `https://minesweeper-[random].vercel.app`

You can also rename your project in Vercel dashboard to get a cleaner URL like:
- `https://minesweeper.vercel.app`
- `https://your-project-name.vercel.app`

