# Connector Game Integration

## Overview
The **Connector** game has been successfully integrated into the 6Degrees app Feed. This is a networking path-finding game designed specifically for startup founders to improve their networking skills by finding connections between different professions.

## What is Connector?
Connector is an educational game where users:
- Select their current profession (starting point)
- Choose a target profession they want to connect with
- Navigate through professional connections to reach their goal
- Earn stars based on performance (optimal path, hearts remaining)
- Learn about career connections and industry relationships

## Integration Details

### Frontend Components
- **Location**: `frontend/src/components/ConnectorGame.tsx`
- **Integrated in**: `frontend/src/pages/Feed.tsx` (new "Connector" tab)
- **Dependencies Added**:
  - `framer-motion` for animations
  - `axios` for API calls (already using via API helper)

### Backend API Routes
- **Location**: `backend/src/routes/connector.ts`
- **Base Path**: `/api/connector`
- **Registered in**: `backend/src/server.ts`

### API Endpoints

#### 1. Get All Jobs
```
GET /api/connector/jobs/all
```
Returns list of all available professions with their industries and sectors.

#### 2. Calculate Optimal Path
```
POST /api/connector/level/calculate-path
Body: { startId: number, targetId: number }
```
Calculates the shortest path between two professions.

#### 3. Get Choices
```
POST /api/connector/level/choices
Body: { currentNodeId: number, targetNodeId: number }
```
Returns 3 choices for the next step (1 correct, 2 wrong).

#### 4. Validate Choice
```
POST /api/connector/level/validate
Body: { currentNodeId: number, targetNodeId: number, chosenNodeId: number }
```
Validates if a chosen path is correct.

#### 5. Graph Info
```
GET /api/connector/graph/info
```
Returns graph statistics (total nodes, edges, playable nodes).

#### 6. Add Custom Job (Auth Required)
```
POST /api/connector/jobs/add
Body: { jobTitle: string }
```
*Currently returns 501 - Not Implemented. Ready for future enhancement.*

### UI/UX Features

#### Mobile-First Design
- Responsive layout optimized for mobile devices
- Touch-friendly buttons and interactions
- Proper spacing for thumbs
- Fixed position "Try Again" button at bottom on mobile
- Smooth animations using framer-motion

#### Game States
1. **Select Start**: User selects their profession
2. **Select Target**: User selects who they want to connect with
3. **Playing**: Active game with choices
4. **Won**: Victory screen with path visualization
5. **Lost**: Out of hearts screen

#### Visual Feedback
- ✓ Correct choice: Green highlight with success animation
- ✗ Wrong choice: Red highlight with shake animation
- Heart system: Visual indicator of remaining attempts
- Score tracking: Points based on performance
- Star rating: 3 stars for perfect path, 2 for good, 1 for completion

### Styling
- Custom animations added to `frontend/src/index.css`
- Shake animation for wrong choices
- Responsive container styles
- Consistent with app's design system (Shadcn UI)

### Current Game Data
**Mock Data (10 professions):**
- Software Engineer
- Product Manager
- Data Scientist
- UX Designer
- Marketing Manager
- Financial Analyst
- Sales Representative
- Human Resources Manager
- Operations Manager
- Startup Founder

**Connection Graph:**
Simple connected graph with realistic professional connections based on industry overlap and skill similarity.

## Future Enhancements

### 1. Expand Job Database
Replace mock data with full dataset from `Export/data/`:
- `job_graph.gpickle` (1471 jobs)
- `core_jobs_with_details.csv`
- `core_jobs_with_embeddings.npz`

### 2. ML-Based Job Classification
Implement the job addition feature using:
- OpenAI API for job detail generation
- Modal for GPU-accelerated embeddings
- Automatic industry/sector classification

### 3. User Progress Tracking
- Save completed paths to database
- Track best scores
- Leaderboards
- Achievement badges

### 4. Social Features
- Share your path with connections
- Challenge friends
- Collaborative path finding

### 5. Educational Content
- Job descriptions on hover
- Required skills displayed
- Career path suggestions

## Deployment Notes

### Environment Variables (Backend)
```env
# Optional: For future ML features
OPENAI_API_KEY=your_api_key
MODAL_TOKEN_ID=your_modal_id
MODAL_TOKEN_SECRET=your_modal_secret
```

### Build Process
No additional build steps required. Standard build process:

**Frontend:**
```bash
cd frontend
npm install
npm run build
```

**Backend:**
```bash
cd backend
npm install
npm run build
```

### Production Deployment
The game works entirely through REST API endpoints. No special server configuration needed beyond the existing setup.

## Testing

### Manual Testing Checklist
- [ ] Load Feed page → Connector tab visible
- [ ] Click Connector tab → Game loads
- [ ] Select starting profession → Transitions to target selection
- [ ] Select target profession → Game starts with 3 hearts
- [ ] Make correct choice → Green feedback, advance
- [ ] Make wrong choice → Red feedback, lose heart, "Try Again" button appears
- [ ] Complete path → Win screen with path visualization
- [ ] Lose all hearts → Lose screen
- [ ] Mobile: All interactions work on touch devices
- [ ] Mobile: Try Again button visible and accessible

### API Testing
```bash
# Test get all jobs
curl http://localhost:3001/api/connector/jobs/all

# Test calculate path
curl -X POST http://localhost:3001/api/connector/level/calculate-path \
  -H "Content-Type: application/json" \
  -d '{"startId": 1, "targetId": 10}'

# Test get choices
curl -X POST http://localhost:3001/api/connector/level/choices \
  -H "Content-Type: application/json" \
  -d '{"currentNodeId": 1, "targetNodeId": 10}'
```

## Mobile App Considerations
- Game works on web, should also work in Capacitor wrapper
- Touch events properly handled
- No native APIs required
- Offline mode: Could cache job data for offline play (future)

## Performance
- Fast load times (small mock dataset)
- Minimal API calls (only on user actions)
- Efficient pathfinding (BFS algorithm)
- Smooth animations (hardware-accelerated via framer-motion)

## Known Limitations
1. **Small Dataset**: Currently only 10 jobs (expandable to 1471)
2. **Simple Connections**: Mock graph connections (can be enhanced)
3. **No Persistence**: Progress not saved (future enhancement)
4. **No ML Features**: Job addition not implemented (requires OpenAI + Modal setup)

## Support
For issues or questions about the Connector game:
1. Check this documentation
2. Review `Export/README.md` for original game details
3. Test API endpoints individually
4. Check browser console for errors

---

**Status**: ✅ Ready for deployment
**Last Updated**: 2025-10-08
**Version**: 1.0
