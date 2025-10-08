# 6 Degrees of Jobs - Deployment Package

A career networking path-finding game where players navigate through professional connections to reach their goal profession.

## 📦 Package Contents

```
Export/
├── README.md                          # This file
├── DEPLOYMENT_GUIDE.md               # Step-by-step deployment instructions
├── backend/                          # Flask API server
│   ├── api_server.py                # Main Flask application
│   ├── job_manager.py               # Job management and graph operations
│   ├── requirements.txt             # Python dependencies
│   └── .env.example                 # Environment variables template
├── frontend/                        # React UI
│   ├── src/
│   │   ├── App.jsx                 # Main React component
│   │   └── App.css                 # Styles
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── data/                            # Game data (initial dataset)
    ├── job_graph.gpickle           # Graph with 1471 jobs
    ├── core_jobs_with_details.csv  # Job metadata
    ├── core_jobs_with_embeddings.npz # Job embeddings (768-dim)
    └── core_jobs_with_embeddings.csv # Embedding metadata
```

## 🎮 Game Features

- **1471 Professional Jobs** across multiple industries and sectors
- **Dynamic Job Addition**: Users can add custom jobs via UI
- **ML-Based Classification**: Auto-classifies new jobs using embedding similarity
- **Real-time Graph Updates**: New jobs are added to graph without rebuilding
- **Path Visualization**: Shows complete journey after winning
- **Hearts System**: 3 lives per game
- **Scoring System**: Based on steps taken and hearts remaining

## 🚀 Quick Start

### Prerequisites

- **Python 3.11+** with pip
- **Node.js 18+** with npm
- **Modal CLI** (for GPU-based embeddings)
- **OpenAI API Key** (for job details generation)

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env and add your OpenAI API key
python api_server.py
```

Server runs on `http://localhost:5000`

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

UI runs on `http://localhost:5173`

## 📊 Data Files

### Required Data Files

1. **job_graph.gpickle** (1.6 MB)
   - NetworkX graph with 1471 nodes, 18392 edges
   - Each node contains: job_title, industry_name, sector_name, job_description, key_skills, responsibilities, embedding

2. **core_jobs_with_details.csv**
   - Source of truth for all job metadata
   - Columns: industry_code, industry_name, sector_name, job_title, job_description, key_skills, responsibilities

3. **core_jobs_with_embeddings.npz**
   - Compressed numpy array (1471 × 768)
   - Model: sentence-transformers/all-mpnet-base-v2

4. **core_jobs_with_embeddings.csv**
   - Metadata linking jobs to their embeddings
   - Includes embedding_index for NPZ lookup

## 🔧 Configuration

### Backend Configuration

Edit `backend/.env`:

```env
OPENAI_API_KEY=your_api_key_here
MODAL_TOKEN_ID=your_modal_token_id
MODAL_TOKEN_SECRET=your_modal_token_secret
GRAPH_PATH=../data/job_graph.gpickle
DATA_DIR=../data
```

### Frontend Configuration

Edit `frontend/src/App.jsx`:

```javascript
const API_URL = 'http://localhost:5000/api';  // or your production URL
```

## 🎯 API Endpoints

### Game Endpoints

- `GET /api/jobs/all` - Get all available jobs
- `POST /api/level/calculate-path` - Calculate optimal path between two jobs
- `POST /api/level/choices` - Get 3 choices for current node
- `POST /api/level/validate` - Validate a choice
- `GET /api/graph/info` - Get graph statistics

### Job Management

- `POST /api/jobs/add` - Add a custom job (async, returns jobId)
- `GET /api/jobs/status/<jobId>` - Poll job processing status

## 🏗️ Architecture

### Backend (Flask + NetworkX + OpenAI + Modal)

1. **Graph Management**: Loads graph into memory, handles concurrent job additions via queue
2. **Job Processing**: ML-based classification using embedding similarity
3. **Embedding Generation**: Uses Modal for GPU-accelerated embeddings
4. **Data Persistence**: Appends to CSV and NPZ files, updates graph pickle

### Frontend (React + Vite + Framer Motion)

1. **Job Selection**: Hierarchical navigation (Sector → Industry → Job)
2. **Game Logic**: Real-time pathfinding with 3 choices per step
3. **Path Visualization**: Animated journey display on win screen
4. **Custom Jobs**: Modal-based job addition with progress tracking

## 📈 Scalability

- **Current**: 1471 jobs, ~25 connections per job
- **Adding Jobs**: Backend handles additions asynchronously
- **Graph Updates**: Incremental updates without full rebuild
- **Embedding Cache**: NPZ file grows incrementally

## 🔒 Security Notes

- OpenAI API key should be in `.env` (never commit!)
- Sanitize user input for job titles
- Rate limit job additions to prevent abuse
- Consider auth for production deployment

## 📝 License & Credits

- Game Concept: Inspired by "Six Degrees of Separation"
- Embedding Model: sentence-transformers/all-mpnet-base-v2
- Job Data: Generated via OpenAI GPT-4

## 🐛 Troubleshooting

### Common Issues

1. **"Job not found in search"**
   - Restart backend to reload graph
   - Check if job is in `data/job_graph.gpickle`

2. **"400 Bad Request on calculate-path"**
   - Graph file path mismatch
   - Ensure GRAPH_PATH in .env is correct

3. **"Modal authentication failed"**
   - Run `modal token new` to authenticate
   - Set MODAL_TOKEN_ID and MODAL_TOKEN_SECRET in .env

4. **"Embedding generation slow"**
   - Modal uses T4 GPU by default
   - Upgrade to A10G/A100 in `modal_embeddings.py` for faster processing

## 📧 Support

For issues or questions, refer to the main project repository.

---

**Version**: 1.0
**Last Updated**: 2025-10-08
