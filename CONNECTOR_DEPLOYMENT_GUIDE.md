# Connector Game - Production Deployment Guide

## Overview
The Connector game requires two backend services:
1. **TypeScript Backend** (existing) - Your main API server
2. **Python Service** (new) - Handles graph operations with 1471 jobs

## Architecture

```
Frontend (React)
    ↓
TypeScript Backend (Express on Railway)
    ↓
Python Service (Flask) - New microservice
    ↓
Graph Data (1471 jobs)
```

## Deployment Options

### Option 1: Deploy to Railway (Recommended for Railway users)

#### Step 1: Deploy Python Service to Railway

1. **Create New Railway Project for Python Service:**
   ```bash
   cd backend/python-service
   railway init
   ```

2. **Configure Railway Settings:**
   - Service name: `6degrees-connector-python`
   - Root directory: `backend/python-service`
   - Build command: `pip install -r requirements.txt`
   - Start command: `python connector_service.py`

3. **Add Environment Variables in Railway:**
   ```
   PYTHON_SERVICE_PORT=5001
   ```

4. **Deploy:**
   ```bash
   railway up
   ```

5. **Get Your Python Service URL:**
   - Railway will give you a URL like: `https://6degrees-connector-python.railway.app`
   - Copy this URL

#### Step 2: Update TypeScript Backend

1. **Add to your backend .env (or Railway environment variables):**
   ```
   PYTHON_SERVICE_URL=https://your-python-service.railway.app
   ```

2. **Redeploy your TypeScript backend:**
   ```bash
   cd backend
   npm run build
   railway up
   ```

### Option 2: Single Railway Service with Both (Alternative)

You can run both services in the same Railway deployment using a Procfile:

1. **Create `Procfile` in backend:**
   ```
   web: node dist/server.js
   worker: cd python-service && python connector_service.py
   ```

2. **Update backend start script in package.json:**
   ```json
   "start": "concurrently \"node dist/server.js\" \"cd python-service && python connector_service.py\""
   ```

3. **Install concurrently:**
   ```bash
   npm install concurrently
   ```

4. **Set environment variable:**
   ```
   PYTHON_SERVICE_URL=http://localhost:5001
   ```

### Option 3: Other Cloud Providers

#### Heroku
- Create two apps (one for Node, one for Python)
- Deploy each separately
- Set PYTHON_SERVICE_URL in Node app config

#### Vercel/Netlify (Frontend only)
- Deploy Python service to Railway/Heroku
- Deploy TypeScript backend to Railway/Heroku
- Deploy frontend to Vercel/Netlify

#### AWS/GCP/Azure
- Deploy Python service as Lambda/Cloud Function
- Update PYTHON_SERVICE_URL accordingly

## Data Files

The Python service needs these files in `backend/data/`:
- ✅ `job_graph.gpickle` (2.5 MB)
- ✅ `core_jobs_with_details.csv` (1.4 MB)
- ✅ `core_jobs_with_embeddings.csv` (1.4 MB)
- ✅ `core_jobs_with_embeddings.npz` (4.7 MB)

**Total: ~10 MB** - These are already copied and ready to deploy.

## Environment Variables

### TypeScript Backend (.env)
```env
# Existing variables...
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
JWT_SECRET=...

# NEW: Connector service
PYTHON_SERVICE_URL=https://your-python-service.railway.app
```

### Python Service (.env)
```env
PYTHON_SERVICE_PORT=5001
```

## Testing Production Deployment

### 1. Test Python Service Directly
```bash
curl https://your-python-service.railway.app/health
```

Expected response:
```json
{
  "status": "ok",
  "graph_loaded": true,
  "total_nodes": 1471,
  "playable_nodes": 1471
}
```

### 2. Test Through TypeScript Backend
```bash
curl https://your-backend.railway.app/api/connector/graph/info
```

Expected response:
```json
{
  "totalNodes": 1471,
  "totalEdges": 18392,
  "playableNodes": 1471
}
```

### 3. Test in Browser
1. Go to your deployed frontend
2. Navigate to Feed → Connector tab
3. Select a job → Should see 1471 jobs available
4. Play the game!

## Build Commands

### TypeScript Backend
```bash
cd backend
npm install
npm run build
npm start
```

### Python Service
```bash
cd backend/python-service
pip install -r requirements.txt
python connector_service.py
```

### Frontend
```bash
cd frontend
npm install
npm run build
```

## Troubleshooting

### Issue: "Failed to fetch jobs"
**Solution:** Python service not running or PYTHON_SERVICE_URL incorrect
- Check Python service health endpoint
- Verify PYTHON_SERVICE_URL in backend env vars
- Check Railway logs for Python service

### Issue: "No path exists between these jobs"
**Solution:** Graph not loaded properly
- Check Python service logs
- Verify data files are present in deployment
- Ensure job_graph.gpickle uploaded correctly

### Issue: "Python service timeout"
**Solution:** Service taking too long to load graph
- Increase timeout in backend/src/routes/connector.ts (currently 10s)
- Check Python service has enough memory allocated
- Railway: Increase memory in settings

### Issue: "Module not found" in Python service
**Solution:** Dependencies not installed
- Verify requirements.txt deployed
- Check Railway build logs
- Manually trigger rebuild

## Performance Considerations

### Graph Loading Time
- First request takes ~2-3 seconds (graph loads into memory)
- Subsequent requests are instant (graph cached in memory)
- Railway keeps service alive, so this is mostly a non-issue

### Memory Usage
- Python service uses ~150-200 MB RAM for graph
- Recommend at least 512 MB RAM allocation
- Railway free tier should be sufficient

### Scaling
- Each Python service instance loads its own graph copy
- For high traffic, consider:
  - Redis caching layer
  - Multiple Python service instances
  - CDN for job list endpoint

## Cost Estimation

### Railway (Recommended)
- **Free Tier:** $5 credit/month
  - TypeScript Backend: ~$2-3/month
  - Python Service: ~$2-3/month
  - **Total: Within free tier for moderate usage**

- **Pro Plan:** $20/month unlimited usage

### Alternative: Single Service
- Run both in one Railway service: ~$3-4/month
- Slightly more complex but cheaper

## Rollback Plan

If Connector game causes issues:

1. **Disable in Frontend:**
   - Remove Connector tab from Feed.tsx
   - Redeploy frontend

2. **Disable in Backend:**
   - Comment out connector routes in server.ts
   - Redeploy backend

3. **Full Rollback:**
   - Revert to previous git commit
   - Redeploy all services

## Monitoring

### Health Checks
- TypeScript Backend: `https://your-backend.railway.app/health`
- Python Service: `https://python-service.railway.app/health`
- Frontend: Check `/connector` tab loads

### Logs
- Railway Dashboard → Select Service → Logs
- Look for:
  - "Graph loaded: 1471 nodes" (Python service started correctly)
  - "Proxying to Python service" (Backend connecting correctly)
  - Any error messages

## Next Steps After Deployment

1. ✅ Deploy Python service
2. ✅ Update backend PYTHON_SERVICE_URL
3. ✅ Redeploy TypeScript backend
4. ✅ Test in production
5. 🎮 Users can play Connector with 1471 jobs!

## Future Enhancements (Not Needed Now)

- [ ] Add OpenAI job addition feature
- [ ] User progress tracking
- [ ] Leaderboards
- [ ] Social sharing
- [ ] Offline mode

---

**Ready to Deploy!** 🚀

Choose your deployment option above and follow the steps. The game is production-ready with the full 1471-job dataset.

**Questions?** Check the troubleshooting section or test locally first with `start-connector.bat` (Windows) or `start-connector.sh` (Mac/Linux).
