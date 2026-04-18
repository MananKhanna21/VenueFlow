#!/bin/bash
# ─────────────────────────────────────────────────────
# VenueFlow — Google Cloud Run Deployment Script
# ─────────────────────────────────────────────────────

set -e

# ── CONFIG — edit these ────────────────────────────────
PROJECT_ID="your-gcp-project-id"       # Your GCP Project ID
SERVICE_NAME="venueflow"
REGION="asia-south1"                   # Mumbai region (closest to India)
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"
# ──────────────────────────────────────────────────────

echo ""
echo "⚡ VenueFlow — Cloud Run Deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Step 1: Authenticate (if not already)
echo "→ Step 1: Checking gcloud auth..."
gcloud auth print-access-token > /dev/null 2>&1 || gcloud auth login

# Step 2: Set project
echo "→ Step 2: Setting project to: $PROJECT_ID"
gcloud config set project $PROJECT_ID

# Step 3: Enable required APIs
echo "→ Step 3: Enabling Cloud Run & Container Registry APIs..."
gcloud services enable run.googleapis.com containerregistry.googleapis.com --quiet

# Step 4: Configure Docker auth
echo "→ Step 4: Configuring Docker for GCR..."
gcloud auth configure-docker --quiet

# Step 5: Build Docker image
echo "→ Step 5: Building Docker image..."
docker build -t $IMAGE_NAME .

# Step 6: Push to GCR
echo "→ Step 6: Pushing image to Google Container Registry..."
docker push $IMAGE_NAME

# Step 7: Deploy to Cloud Run
echo "→ Step 7: Deploying to Cloud Run ($REGION)..."
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_NAME \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --port 8080 \
  --memory 256Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --quiet

# Step 8: Get URL
echo ""
echo "✅ Deployment successful!"
echo ""
URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)')
echo "🌐 Your Cloud Run URL:"
echo "   $URL"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Share this URL for your submission!"
