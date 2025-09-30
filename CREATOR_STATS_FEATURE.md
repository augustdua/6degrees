# Creator Subtree Statistics Feature

## Overview

Added a comprehensive statistics panel visible only to connection request creators, showing detailed breakdown of all subtrees and paths in their chain.

## Features

### 📊 Overview Cards (4 Metrics)
1. **Total Subtrees** - Number of direct children (independent subtrees)
2. **Total Paths** - Number of complete paths from creator to leaf nodes
3. **Total Rewards** - Sum of all rewards across all paths
4. **Frozen Subtrees** - Count of currently frozen subtrees

### 🌳 Detailed Subtree Breakdown

For each subtree, shows:
- **Subtree Root Name** - Name of the direct child who started this subtree
- **Freeze Status** - Frozen (blue) or Decaying (orange) with visual badge
- **Freeze Timer** - Countdown showing time until freeze expires
- **Path Count** - Number of paths in this subtree
- **Leaf Nodes** - Number of end nodes in this subtree
- **Average Depth** - Average path length in this subtree
- **Max Depth** - Longest path in this subtree
- **Total Reward** - Sum of rewards for all paths in this subtree
- **Growth Progress Bar** - Visual representation of this subtree vs total

## Implementation

### Backend

**File:** `backend/src/controllers/pathController.ts`

**New Function:** `getSubtreeStats()`
- Verifies user is the creator
- Fetches all paths for the chain
- Groups by `subtree_root_id`
- Calculates aggregate statistics
- Returns sorted by path count (most active first)

**API Endpoint:** `GET /api/paths/:chainId/subtree-stats`
- **Access:** Private (Creator only)
- **Returns:** Array of subtree statistics

**Permission Check:**
```typescript
const isCreator = chain.connection_requests?.creator_id === userId;
if (!isCreator) {
  return res.status(403).json({
    success: false,
    message: 'Only the creator can view these statistics'
  });
}
```

### Frontend

**Component:** `SubtreeStatsPanel.tsx`

**Props:**
- `chainId` - ID of the chain to fetch stats for
- `isCreator` - Boolean determining if component renders
- `className` - Optional styling

**Features:**
- Auto-refreshes every 60 seconds
- Real-time freeze countdown timers
- Responsive grid layout (mobile-optimized)
- Color-coded freeze status (blue = frozen, orange = decaying)
- Progress bars showing relative subtree sizes
- Empty state when no subtrees exist

**Integration:**
Located in `RequestDetails.tsx` below `ChainVisualization`:
```tsx
{chain && (
  <SubtreeStatsPanel
    chainId={chain.id}
    isCreator={request.creator_id === user?.id}
    className="mt-6"
  />
)}
```

## UI/UX

### Desktop Layout
```
┌─────────────────────────────────────────────────────────┐
│  [Total Subtrees: 18]  [Total Paths: 19]                │
│  [Total Rewards: 100]  [Frozen: 3]                      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 🌳 Subtree Details                                       │
│                                                          │
│ ┌─ Praveen Kumar ────────────────────────── ❄️ Frozen ─┐│
│ │ Unfreezes in 8h 23m                                  ││
│ │ Paths: 1  Leaves: 1  Avg: 2.0  Max: 2  Reward: 5.26 ││
│ │ Progress: ████░░░░░░ 5%                              ││
│ └──────────────────────────────────────────────────────┘│
│                                                          │
│ ┌─ Tanish Parashar ──────────────────────── 🔥 Decaying┐│
│ │ Paths: 2  Leaves: 2  Avg: 2.5  Max: 3  Reward: 10.53││
│ │ Progress: ██████████░ 11%                            ││
│ └──────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### Mobile Layout
```
┌─────────────────┬─────────────────┐
│ Total Subtrees  │ Total Paths     │
│      18         │      19         │
└─────────────────┴─────────────────┘

┌─ Praveen Kumar ────────── ❄️ ─┐
│ Unfreezes: 8h 23m              │
│ Paths: 1    Leaves: 1          │
│ Reward: 5.26 ETH               │
│ ████░░░░░░ 5%                  │
└────────────────────────────────┘
```

## Visibility Rules

### ✅ Visible To:
- **Creator** of the connection request only

### ❌ Hidden From:
- Regular chain participants
- Forwarders
- Target users
- Non-authenticated users

**Implementation:**
```tsx
if (!isCreator) return null;
```

Component doesn't render at all for non-creators (no DOM footprint).

## Data Flow

1. **Page Load:**
   - RequestDetails checks if user is creator
   - Passes `isCreator` boolean to SubtreeStatsPanel
   - Component fetches stats via API if creator

2. **Auto-Refresh:**
   - Timer updates freeze countdowns every 60s
   - Re-fetches stats from API every 60s
   - Updates UI with new data

3. **API Call:**
   ```
   GET /api/paths/{chainId}/subtree-stats
   Authorization: Bearer {token}

   Response:
   {
     "success": true,
     "data": {
       "chain_id": "...",
       "subtrees": [...]
     }
   }
   ```

## Example Data Structure

```typescript
{
  subtree_root_id: "b4db1c3f-a469-4794-a538-f32f247c2d01",
  subtree_root_name: "Praveen Kumar",
  path_count: 1,
  total_reward: 5.26315789,
  avg_path_length: 2.0,
  deepest_path_length: 2,
  leaf_count: 1,
  is_frozen: true,
  freeze_ends_at: "2025-09-27T12:30:00Z"
}
```

## Benefits

1. **Transparency** - Creator sees exactly how their chain is growing
2. **Performance Tracking** - Identify which subtrees are most active
3. **Freeze Monitoring** - Track which subtrees are frozen and when they unfreeze
4. **Reward Distribution** - See reward allocation across subtrees
5. **Strategic Insights** - Understand which referrals are most effective

## Testing Checklist

- [ ] Only visible to request creator
- [ ] Hidden from all other users
- [ ] Shows correct subtree count
- [ ] Calculates path statistics accurately
- [ ] Freeze status updates in real-time
- [ ] Countdown timer decrements properly
- [ ] Mobile responsive layout works
- [ ] Empty state shows when no subtrees
- [ ] Auto-refresh works every 60s
- [ ] API returns 403 for non-creators

## Future Enhancements

1. **Export Stats** - Download CSV of subtree data
2. **Historical Data** - Track subtree growth over time
3. **Notifications** - Alert when subtree unfreezes
4. **Ranking** - Show top-performing subtrees
5. **Forecasting** - Predict when chain will complete based on growth rate