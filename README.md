# ⚡ VenueFlow — AI-Powered Smart Stadium Companion

> Real-time crowd intelligence, queue prediction, and AI concierge for large-scale sporting venues.

## 🏟️ Features

- **Live Stadium Heatmap** — SVG top-down map with crowd density overlays (4 Indian stadiums)
- **Smart Queue Predictor** — Real-time wait times for gates, food courts, restrooms, merch, parking
- **AI Alert Feed** — Live alerts + Claude-generated smart alerts
- **AI Concierge Chatbot** — Full conversational assistant with live venue context
- **Share Experience** — AI-generated LinkedIn/Twitter posts
- **Game Phase Simulation** — Timeline bar to simulate Pre-Game → Post-Match crowd flow

## 📁 Project Structure

```
venueflow/
├── index.html          # Main app shell
├── app.js              # Core logic, Claude API calls, all UI logic
├── styles/
│   └── main.css        # Dark stadium theme
├── data/
│   └── venueData.js    # 4 stadium layouts + alert seeds + phase modifiers
├── Dockerfile          # Production Docker image (nginx:alpine)
├── nginx.conf          # Cloud Run compatible nginx config
├── deploy.sh           # One-command Cloud Run deployment
└── README.md
```

## 🚀 Local Development

```bash
# Option 1: Direct browser (simplest)
# Open index.html in your browser — no server needed!
# Note: The Claude API will work since calls go from browser to api.anthropic.com

# Option 2: Simple local server (if needed)
npx serve .
# or
python3 -m http.server 8080
# then open http://localhost:8080
```

## ☁️ Google Cloud Run Deployment

### Prerequisites
- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) installed
- [Docker](https://docs.docker.com/get-docker/) installed
- A GCP project with billing enabled

### Steps

**1. Edit deploy.sh**
```bash
# Open deploy.sh and set your project ID:
PROJECT_ID="your-actual-gcp-project-id"
```

**2. Run deployment**
```bash
chmod +x deploy.sh
./deploy.sh
```

**3. Get your URL**
The script prints your live URL at the end:
```
🌐 Your Cloud Run URL:
   https://venueflow-xxxxxxxxxx-em.a.run.app
```

### Manual Deployment (step by step)

```bash
# Set your project
export PROJECT_ID="your-gcp-project-id"
export REGION="asia-south1"

# Authenticate
gcloud auth login
gcloud config set project $PROJECT_ID

# Enable APIs
gcloud services enable run.googleapis.com containerregistry.googleapis.com

# Build & push
gcloud auth configure-docker
docker build -t gcr.io/$PROJECT_ID/venueflow .
docker push gcr.io/$PROJECT_ID/venueflow

# Deploy
gcloud run deploy venueflow \
  --image gcr.io/$PROJECT_ID/venueflow \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --port 8080

# Get URL
gcloud run services describe venueflow --region=$REGION --format='value(status.url)'
```

## 🔑 API Key Note

The app calls the Anthropic API **directly from the browser**. This means:
- No backend server needed
- The API key is handled by the Anthropic proxy (since you're building in Claude.ai environment)

If deploying standalone outside Claude.ai, you would need to:
1. Add your own Anthropic API key header in `app.js`
2. Or build a simple proxy backend

## 🏟️ Supported Venues

| Stadium | City | Capacity |
|---|---|---|
| Wankhede Stadium | Mumbai | 33,108 |
| Eden Gardens | Kolkata | 66,349 |
| Narendra Modi Stadium | Ahmedabad | 132,000 |
| DY Patil Stadium | Navi Mumbai | 55,000 |

## 🛠️ Tech Stack

- **Frontend**: Vanilla HTML/CSS/JS (zero dependencies)
- **AI**: Claude claude-sonnet-4-20250514 (Anthropic API)
- **Deployment**: Docker + Google Cloud Run + nginx:alpine
- **Fonts**: Bebas Neue, DM Sans, JetBrains Mono
- **Build**: Google Antigravity

## 📝 Submission Checklist

- [x] Functional app with 4 interactive tabs
- [x] AI-powered features (Queue Tips, Alert Generator, Chatbot, Share Post)
- [x] 4 real Indian stadium layouts
- [x] Live simulation with phase-based crowd modelling
- [x] Dockerfile + Cloud Run deployment
- [x] Google Antigravity powered

---
*Built for the bi-weekly challenge. Powered by VenueFlow AI · Google Antigravity*
