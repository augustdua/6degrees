# Connector Game - Quick Deploy to Railway 🚀

## Fastest Way to Deploy (5 minutes)

### Step 1: Deploy Python Service

```bash
# Navigate to python service
cd backend/python-service

# Login to Railway (if not already)
railway login

# Create new project
railway init

# Link to new service
railway link

# Deploy!
railway up
```

Railway will give you a URL like: `https://connector-python-production.up.railway.app`

### Step 2: Update Backend Environment Variable

In your Railway dashboard for your **main TypeScript backend**:

1. Go to Variables
2. Add new variable:
   ```
   PYTHON_SERVICE_URL=https://connector-python-production.up.railway.app
   ```
3. Click "Deploy" (automatic redeploy)

### Step 3: Test

Visit your app → Feed → Connector tab → You should see 1471 jobs!

---

## Alternative: One-Command Deploy

If you're already in Railway and want to add the Python service to your existing project:

```bash
cd backend/python-service
railway up
```

Then add the environment variable as shown in Step 2.

---

## Verify Deployment

**Python Service Health Check:**
```bash
curl https://your-python-service.railway.app/health
```

Should return:
```json
{
  "status": "ok",
  "graph_loaded": true,
  "total_nodes": 1471,
  "playable_nodes": 1471
}
```

**Full API Test:**
```bash
curl https://your-backend.railway.app/api/connector/graph/info
```

Should return:
```json
{
  "totalNodes": 1471,
  "totalEdges": 18392,
  "playableNodes": 1471
}
```

---

## That's It! 🎉

Your Connector game is now live with the full 1471-job dataset.

**Having issues?** See `CONNECTOR_DEPLOYMENT_GUIDE.md` for detailed troubleshooting.
