# Quick Start Guide - 5 Minutes to Running

Get the game running locally in 5 minutes!

## ⚡ Super Fast Setup

### 1. Install Dependencies (2 min)

**Backend:**
```bash
cd Export/backend
pip install flask flask-cors networkx numpy pandas openai modal sentence-transformers
```

**Frontend:**
```bash
cd Export/frontend
npm install
```

### 2. Configure API Key (1 min)

```bash
cd Export/backend
cp .env.example .env
```

Edit `.env` and add your OpenAI key:
```env
OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE
GRAPH_PATH=../data/job_graph.gpickle
DATA_DIR=../data
```

### 3. Start Servers (1 min)

**Terminal 1 - Backend:**
```bash
cd Export/backend
python api_server.py
```

Wait for: `Graph loaded: 1471 nodes`

**Terminal 2 - Frontend:**
```bash
cd Export/frontend
npm run dev
```

### 4. Play! (1 min)

Open http://localhost:5173

**Test the game:**
1. Search for "Software Developer"
2. Click "Information (Technology & Media)" sector
3. Click "Software Publishers" industry
4. Select "Software Developer"
5. Select a target job (e.g., "Marketing Manager")
6. Play the game!
7. Win and see your complete path! 🎉

## ✅ What You Should See

**Backend Console:**
```
Loading graph...
Graph loaded: 1471 nodes, 18392 edges
Playable nodes: 1469
[OK] Job queue worker started in background
* Running on http://127.0.0.1:5000
```

**Frontend Browser:**
- Job selection screen with search bar
- Hierarchical navigation (Sector → Industry → Job)
- "What's your job?" title

## 🧪 Test Custom Job Addition

1. Click "Can't find your job? Add it here"
2. Enter "Quantum Computing Researcher"
3. Watch progress bar (0% → 100%)
4. Job is automatically selected
5. Play a game with your new job!

## 🐛 Quick Troubleshooting

**Problem:** Backend won't start
```bash
# Check Python version (need 3.11+)
python --version

# Install missing packages
pip install -r requirements.txt
```

**Problem:** Frontend won't start
```bash
# Check Node version (need 18+)
node --version

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Problem:** "Graph file not found"
```bash
# Verify data files exist
ls -lh Export/data/

# Should see:
# job_graph.gpickle
# core_jobs_with_details.csv
# core_jobs_with_embeddings.csv
# core_jobs_with_embeddings.npz
```

**Problem:** CORS error in browser
- Check backend is running on port 5000
- Check frontend is on port 5173
- Restart both servers

## 📁 File Locations

```
Export/
├── backend/
│   ├── api_server.py          ← Start this first
│   └── .env                   ← Your API key here
├── frontend/
│   └── npm run dev            ← Start this second
└── data/
    └── job_graph.gpickle      ← Must exist!
```

## ⏭️ Next Steps

Once it's running:

1. Read `README.md` for full features
2. Review `DEPLOYMENT_GUIDE.md` for production deployment
3. Check `FILE_STRUCTURE.md` to understand the codebase

## 💡 Pro Tips

- Use Ctrl+C to stop servers
- Backend auto-reloads on code changes
- Frontend has hot-reload enabled
- Check browser console for errors
- Check terminal for backend logs

---

**Time to first game: ~5 minutes**
**Jobs available: 1471**
**Ready to deploy: ✓**

Enjoy! 🎮
