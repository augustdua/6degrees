# 6 Degrees of Jobs - Deployment Guide

Step-by-step instructions for deploying the game to your app project.

## 📋 Prerequisites Checklist

Before you begin, ensure you have:

- [ ] Python 3.11 or higher installed
- [ ] Node.js 18 or higher installed
- [ ] OpenAI API key
- [ ] Modal account (free tier available)
- [ ] Git (optional, for version control)

## 🚀 Step 1: Setup Python Environment

```bash
cd Export/backend
python -m venv venv

# On Windows:
venv\Scripts\activate

# On Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
```

## 🔑 Step 2: Configure Environment Variables

```bash
cd backend
cp .env.example .env
```

Edit `.env` and add your credentials:

```env
OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE
MODAL_TOKEN_ID=your_modal_token
MODAL_TOKEN_SECRET=your_modal_secret
```

### Getting Modal Credentials

```bash
# Install Modal CLI
pip install modal

# Authenticate
modal token new

# Your credentials will be shown - add them to .env
```

## 📦 Step 3: Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

## 🎮 Step 4: Test Locally

### Start Backend (Terminal 1)

```bash
cd Export/backend
python api_server.py
```

You should see:
```
Graph loaded: 1471 nodes, 18392 edges
Playable nodes: 1469
[OK] Job queue worker started in background
* Running on http://127.0.0.1:5000
```

### Start Frontend (Terminal 2)

```bash
cd Export/frontend
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

### Test the Game

1. Open http://localhost:5173
2. Select your starting job
3. Select target job
4. Play the game!
5. Try adding a custom job

## 🌐 Step 5: Production Deployment

### Option A: Deploy to Your Existing App

#### Backend Integration

1. **Copy backend files to your app:**
   ```bash
   cp -r Export/backend/* your-app/backend/6degrees/
   cp -r Export/data your-app/data/6degrees/
   ```

2. **Update paths in `api_server.py`:**
   ```python
   GRAPH_PATH = Path(__file__).parent.parent.parent / "data" / "6degrees" / "job_graph.gpickle"
   ```

3. **Add Flask routes to your existing Flask app:**
   - Import routes from `api_server.py`
   - Mount under `/api/6degrees/` prefix

4. **Update `job_manager.py` paths:**
   - Update GRAPH_PATH
   - Update DATA_DIR
   - Update NAICS_PATH

#### Frontend Integration

1. **Copy frontend files:**
   ```bash
   cp Export/frontend/src/* your-app/frontend/src/pages/6degrees/
   ```

2. **Update API URL in `App.jsx`:**
   ```javascript
   const API_URL = '/api/6degrees';  // Your production API path
   ```

3. **Add route to your React Router:**
   ```javascript
   <Route path="/6degrees" element={<SixDegreesGame />} />
   ```

### Option B: Deploy as Standalone Service

#### Backend (Flask)

**Using Gunicorn:**

```bash
cd Export/backend
pip install gunicorn

# Production server
gunicorn -w 4 -b 0.0.0.0:5000 api_server:app
```

**Using Docker:**

Create `Dockerfile`:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
COPY ../data /data

EXPOSE 5000

CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "api_server:app"]
```

Build and run:
```bash
docker build -t 6degrees-backend .
docker run -p 5000:5000 -v ./data:/data --env-file .env 6degrees-backend
```

#### Frontend (React + Vite)

**Build for production:**

```bash
cd Export/frontend
npm run build
```

This creates a `dist/` folder with optimized static files.

**Deploy options:**

1. **Vercel:**
   ```bash
   npm install -g vercel
   vercel --prod
   ```

2. **Netlify:**
   ```bash
   npm install -g netlify-cli
   netlify deploy --prod --dir=dist
   ```

3. **AWS S3 + CloudFront:**
   ```bash
   aws s3 sync dist/ s3://your-bucket/
   ```

4. **Serve with Nginx:**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

       root /var/www/6degrees/dist;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }

       location /api/ {
           proxy_pass http://localhost:5000;
       }
   }
   ```

## 🔧 Step 6: Configuration for Production

### Backend Configuration

1. **Update CORS origins:**
   ```python
   # In api_server.py
   CORS(app, origins=["https://yourdomain.com"])
   ```

2. **Disable debug mode:**
   ```python
   if __name__ == '__main__':
       app.run(debug=False, port=5000)
   ```

3. **Set up logging:**
   ```python
   import logging
   logging.basicConfig(level=logging.INFO)
   ```

### Frontend Configuration

1. **Update API URL:**
   ```javascript
   // In App.jsx
   const API_URL = 'https://api.yourdomain.com/api';
   ```

2. **Build with production settings:**
   ```bash
   NODE_ENV=production npm run build
   ```

## 📊 Step 7: Database & File Storage

### Current Setup (Files)

- Graph: `job_graph.gpickle` (~1.6 MB)
- CSV: `core_jobs_with_details.csv` (~500 KB)
- Embeddings: `core_jobs_with_embeddings.npz` (~4 MB)

### Scaling Considerations

For production with many users adding jobs:

1. **Move to PostgreSQL/MongoDB:**
   - Store job metadata in database
   - Keep embeddings in separate file storage (S3)
   - Cache graph in Redis

2. **Implement backup strategy:**
   ```bash
   # Daily backup script
   cp data/job_graph.gpickle backups/job_graph_$(date +%Y%m%d).gpickle
   ```

## 🔒 Step 8: Security Hardening

### API Security

1. **Add rate limiting:**
   ```python
   from flask_limiter import Limiter

   limiter = Limiter(app, default_limits=["100 per hour"])

   @limiter.limit("10 per minute")
   @app.route('/api/jobs/add', methods=['POST'])
   def add_custom_job():
       # ...
   ```

2. **Input validation:**
   ```python
   def sanitize_job_title(title):
       # Remove special characters, limit length
       return re.sub(r'[^a-zA-Z0-9\s-]', '', title)[:100]
   ```

3. **Add authentication (optional):**
   ```python
   from flask_httpauth import HTTPBasicAuth
   auth = HTTPBasicAuth()

   @app.route('/api/jobs/add', methods=['POST'])
   @auth.login_required
   def add_custom_job():
       # ...
   ```

### Environment Variables

Never commit `.env` file! Add to `.gitignore`:
```
.env
*.gpickle
*.npz
```

## 📈 Step 9: Monitoring & Analytics

### Backend Monitoring

```python
# Add to api_server.py
from prometheus_flask_exporter import PrometheusMetrics
metrics = PrometheusMetrics(app)

# Track custom metrics
game_plays = metrics.counter(
    'game_plays_total', 'Total games played'
)

@app.route('/api/level/new')
def new_level():
    game_plays.inc()
    # ...
```

### Frontend Analytics

```javascript
// In App.jsx
useEffect(() => {
    // Google Analytics
    gtag('event', 'game_start', {
        start_job: myJob.title,
        target_job: targetJob.title
    });
}, [gameState.gameStatus]);
```

## 🧪 Step 10: Testing

### Backend Tests

Create `test_api.py`:
```python
import pytest
from api_server import app

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_get_all_jobs(client):
    rv = client.get('/api/jobs/all')
    assert rv.status_code == 200
    assert len(rv.json['jobs']) > 0
```

Run tests:
```bash
pytest test_api.py
```

### Frontend Tests

```bash
npm run test
```

## 🐛 Troubleshooting

### Issue: "ModuleNotFoundError: No module named 'modal'"

**Solution:**
```bash
pip install modal
modal token new
```

### Issue: "Graph file not found"

**Solution:**
Check paths in `api_server.py`:
```python
GRAPH_PATH = Path(__file__).parent.parent / "data" / "job_graph.gpickle"
print(f"Looking for graph at: {GRAPH_PATH.absolute()}")
```

### Issue: "CORS error in browser"

**Solution:**
Update CORS origins in `api_server.py`:
```python
CORS(app, origins=["http://localhost:5173", "https://yourdomain.com"])
```

### Issue: "OpenAI API rate limit exceeded"

**Solution:**
Implement caching:
```python
from functools import lru_cache

@lru_cache(maxsize=1000)
def generate_job_details(job_title, industry, sector):
    # ...
```

## ✅ Post-Deployment Checklist

- [ ] Backend responding on production URL
- [ ] Frontend loads and displays jobs
- [ ] Can start and complete a game
- [ ] Can add custom jobs
- [ ] Path visualization shows on win screen
- [ ] Error messages are user-friendly
- [ ] Logs are being captured
- [ ] Backups are automated
- [ ] Monitoring is active

## 📞 Need Help?

Common issues and solutions are in the README.md file.

---

**Last Updated:** 2025-10-08
