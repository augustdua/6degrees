# 6 Degrees of Jobs - File Structure

Complete listing of all files in the Export package with descriptions.

## 📁 Directory Structure

```
Export/
├── README.md                          # Overview and quick start
├── DEPLOYMENT_GUIDE.md               # Detailed deployment instructions
├── FILE_STRUCTURE.md                 # This file
│
├── backend/                          # Flask API Server
│   ├── api_server.py                # Main Flask application (renamed from app.py)
│   ├── job_manager.py               # Job operations & graph management (renamed from add_custom_job.py)
│   ├── requirements.txt             # Python dependencies
│   └── .env.example                 # Environment variables template
│
├── frontend/                        # React UI (Vite)
│   ├── src/
│   │   ├── App.jsx                 # Main React component with game logic
│   │   ├── App.css                 # All styles including path visualization
│   │   └── main.jsx                # React entry point
│   ├── index.html                  # HTML template
│   ├── package.json                # npm dependencies
│   └── vite.config.js              # Vite configuration
│
└── data/                            # Game Data Files
    ├── job_graph.gpickle           # NetworkX graph (1471 nodes, 18392 edges)
    ├── core_jobs_with_details.csv  # Job metadata (source of truth)
    ├── core_jobs_with_embeddings.npz # 768-dim embeddings (compressed)
    └── core_jobs_with_embeddings.csv # Embedding metadata
```

## 📄 File Descriptions

### Root Files

| File | Size | Description |
|------|------|-------------|
| `README.md` | 8 KB | Package overview, features, quick start guide |
| `DEPLOYMENT_GUIDE.md` | 15 KB | Step-by-step deployment instructions |
| `FILE_STRUCTURE.md` | This file | Complete file listing and descriptions |

### Backend Files

| File | Size | Description | Key Functions |
|------|------|-------------|---------------|
| `api_server.py` | 14 KB | Main Flask application | - Game endpoints<br>- Job management routes<br>- Graph loading<br>- Async job processing queue |
| `job_manager.py` | 18 KB | Job operations module | - `generate_job_details()`: GPT-4 job generation<br>- `classify_job_by_similarity()`: ML classification<br>- `generate_embedding_via_modal()`: GPU embeddings<br>- `add_job_to_graph()`: Graph updates<br>- `append_job_to_core_details()`: CSV persistence<br>- `append_embedding_to_store()`: NPZ persistence |
| `requirements.txt` | 1 KB | Python dependencies | - flask, flask-cors<br>- networkx<br>- numpy, pandas<br>- openai<br>- modal<br>- sentence-transformers |
| `.env.example` | <1 KB | Environment template | - OPENAI_API_KEY<br>- MODAL_TOKEN_ID/SECRET<br>- GRAPH_PATH, DATA_DIR |

### Frontend Files

| File | Size | Description | Key Components |
|------|------|-------------|----------------|
| `src/App.jsx` | 30 KB | Main React app | - `JobSelectionScreen`: Hierarchical job browser<br>- `GameScreen`: Gameplay UI<br>- `WinScreen`: Path visualization<br>- `AddJobModal`: Custom job UI<br>- `HowToPlayModal`: Instructions |
| `src/App.css` | 45 KB | All styles | - Dark mode theme<br>- Game animations<br>- Path visualization<br>- Responsive design |
| `src/main.jsx` | <1 KB | React entry | - React 18 setup<br>- DOM rendering |
| `index.html` | 1 KB | HTML template | - App container<br>- Meta tags |
| `package.json` | 1 KB | npm config | - react, react-dom<br>- framer-motion<br>- axios<br>- vite |
| `vite.config.js` | <1 KB | Vite config | - Dev server setup<br>- Build config |

### Data Files

| File | Size | Type | Description |
|------|------|------|-------------|
| `job_graph.gpickle` | 1.6 MB | Binary | NetworkX graph with:<br>- 1471 nodes (jobs)<br>- 18392 edges (connections)<br>- Node attributes: job_title, industry_name, sector_name, job_description, key_skills, responsibilities, embedding (768-dim) |
| `core_jobs_with_details.csv` | 500 KB | CSV | Source of truth for job metadata:<br>- industry_code, industry_name, sector_name<br>- job_title<br>- job_description<br>- key_skills<br>- responsibilities |
| `core_jobs_with_embeddings.npz` | 4 MB | Binary | Compressed numpy array (1471 × 768):<br>- Model: all-mpnet-base-v2<br>- Generated via Modal + GPU |
| `core_jobs_with_embeddings.csv` | 600 KB | CSV | Embedding metadata:<br>- All columns from core_jobs_with_details.csv<br>- embedding_index (for NPZ lookup) |

## 🔄 Data Flow

### Adding a New Job from UI

```
User enters job title
    ↓
Frontend POST /api/jobs/add
    ↓
Backend queues job (async)
    ↓
[Worker Thread]
    ├─ Generate initial details (GPT-4)
    ├─ Classify by ML similarity (generate embedding)
    ├─ Regenerate details with industry context (GPT-4)
    ├─ Generate final embedding (Modal + GPU)
    ├─ Persist to CSVs
    │   ├─ core_jobs_with_details.csv (append)
    │   └─ core_jobs_with_embeddings.csv (append)
    ├─ Append embedding to NPZ
    │   └─ core_jobs_with_embeddings.npz (append)
    └─ Update graph
        ├─ Load job_graph.gpickle
        ├─ Add new node with embedding
        ├─ Find top-12 similar jobs
        ├─ Create edges (similarity ≥ 0.65)
        ├─ Save updated graph (overwrite)
        └─ Reload graph in Flask memory
            ↓
User polls /api/jobs/status/<jobId>
    ↓
Frontend shows progress (0% → 100%)
    ↓
Job complete! ✓
```

### Playing a Game

```
User selects start job
    ↓
User selects target job
    ↓
Frontend POST /api/level/calculate-path
    ↓
Backend calculates optimal path (NetworkX shortest_path)
    ↓
Frontend displays current node
    ↓
[Game Loop]
    Frontend POST /api/level/choices
        ↓
    Backend returns 3 choices:
        - 1 correct (on optimal path)
        - 2 wrong (random neighbors)
        ↓
    User selects a choice
        ↓
    Frontend POST /api/level/validate
        ↓
    Backend validates choice
        ↓
    If correct:
        - Update current node
        - Add to path history
        - Repeat loop
    If wrong:
        - Lose 1 heart
        - Show correct answer
        - User clicks "Try Again"
        - Repeat loop
    If reached target:
        - Game won! 🎉
        - Show complete path visualization
```

## 📦 Dependencies

### Backend (Python)

```
flask==3.0.0              # Web framework
flask-cors==4.0.0         # Cross-origin support
networkx==3.2             # Graph operations
numpy==1.26.0             # Array operations
pandas==2.1.0             # Data manipulation
openai==1.3.0             # GPT-4 API
modal==0.57.0             # GPU-based embeddings
sentence-transformers==2.2.0  # Local embedding fallback
```

### Frontend (Node.js)

```
react==18.2.0             # UI library
react-dom==18.2.0         # DOM rendering
framer-motion==10.16.0    # Animations
axios==1.6.0              # HTTP client
vite==5.0.0               # Build tool
```

## 🔐 Security Notes

### Files That Should NEVER Be Committed

- `.env` (contains API keys)
- Any files with actual API credentials
- Backup files (*.backup, *.bak)

### Files That Are Safe to Commit

- `.env.example` (template only, no real credentials)
- All code files (.py, .jsx, .css)
- Data files (*.gpickle, *.csv, *.npz)
- Documentation (*.md)

## 💾 File Size Summary

| Category | Total Size |
|----------|-----------|
| Backend Code | ~32 KB |
| Frontend Code | ~76 KB |
| Data Files | ~6.1 MB |
| Documentation | ~25 KB |
| **Total Package** | **~6.2 MB** |

## 🔄 File Relationships

```
api_server.py
    ↓ imports
job_manager.py
    ↓ uses
[OpenAI API] + [Modal API]
    ↓ generates
Embeddings → core_jobs_with_embeddings.npz
    ↓ indexed by
core_jobs_with_embeddings.csv
    ↓ source data from
core_jobs_with_details.csv
    ↓ built into
job_graph.gpickle
    ↓ loaded by
api_server.py
    ↓ serves
Frontend (App.jsx)
    ↓ styled by
App.css
```

## 📝 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-10-08 | Initial export package |

## 🎯 Next Steps

After reviewing this file structure:

1. Read `README.md` for overview
2. Follow `DEPLOYMENT_GUIDE.md` step-by-step
3. Test locally before production deployment
4. Customize for your app's architecture

---

**Note**: All file sizes are approximate and may vary slightly based on operating system and file system.
