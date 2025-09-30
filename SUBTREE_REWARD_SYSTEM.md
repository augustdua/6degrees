# Subtree-Based Reward Decay System

## Architecture

### Tree Structure
```
                Creator (Root)
                   |
      ┌────────────┼────────────┐
      │            │            │
   Subtree1     Subtree2    Subtree3
   (Child1)     (Child2)    (Child3)
      |            |            |
   ┌──┴──┐     ┌──┴──┐     ┌──┴──┐
   │     │     │     │     │     │
  1.1   1.2   2.1   2.2   3.1   3.2
```

### Freeze Mechanics

**Rule:** When a node joins Subtree1, **only Subtree1 freezes** for 12 hours.

Example:
- Node 1.1 joins → Subtree1 (Child1 + 1.1 + 1.2 + descendants) freezes
- Subtree2 and Subtree3 continue decaying
- Each subtree is independent

## SQL Schema

### `chain_paths` Table

Stores all paths from creator (root) to leaf nodes:

```sql
CREATE TABLE chain_paths (
    id UUID PRIMARY KEY,
    chain_id UUID REFERENCES chains(id),
    path_id TEXT UNIQUE,

    -- Path structure
    creator_id UUID,
    leaf_userid UUID,
    subtree_root_id UUID,  -- Direct child of creator (defines subtree)

    -- Path data
    path_userids UUID[],        -- [creator, child1, ..., leaf]
    path_participants JSONB,     -- Full participant objects

    -- Rewards
    base_reward DECIMAL(20, 8),
    current_reward DECIMAL(20, 8),

    -- Subtree freeze
    subtree_frozen_until TIMESTAMP,
    last_child_added_at TIMESTAMP,

    -- Metadata
    path_length INTEGER,
    is_complete BOOLEAN,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### Key Concepts

1. **`subtree_root_id`**: The direct child of creator that defines the subtree
   - All paths with same `subtree_root_id` are in the same subtree
   - They share the same freeze status

2. **`path_userids`**: Ordered array from creator to leaf
   - Example: `[creator_id, child1_id, child1.1_id]`

3. **`subtree_frozen_until`**: Timestamp when freeze expires
   - NULL = not frozen (decaying)
   - Future timestamp = frozen until that time

## Backend API

### Routes

**POST `/api/paths/:chainId/update`**
- Recalculates all paths when a node joins
- Deletes old paths, inserts new ones
- Called automatically on chain updates

**POST `/api/paths/:chainId/freeze/:subtreeRootId`**
- Freezes a specific subtree
- Updates `subtree_frozen_until` for all paths in that subtree
- Body: `{ freezeHours: 12 }`

**GET `/api/paths/:chainId`**
- Returns all paths with calculated freeze status
- Uses `active_chain_paths_with_rewards` view
- Includes `is_frozen` and `freeze_seconds_remaining`

### Path Building Algorithm

```typescript
function buildChainPaths(participants):
    1. Find creator (root)
    2. Build adjacency list (parent -> children)
    3. Find all leaf nodes (no children)
    4. For each leaf:
        a. DFS from creator to leaf
        b. Record full path
        c. Identify subtree_root (path[1])
        d. Store path with metadata
    5. Return all paths
```

### Automatic Freeze on Node Join

When a new node joins with `parentUserId`:

1. **Identify subtree**: Find which subtree the parent belongs to
2. **Update paths**: Call `POST /api/paths/:chainId/update`
3. **Freeze subtree**: Call `POST /api/paths/:chainId/freeze/:subtreeRootId`
4. Result: Only that subtree's rewards freeze for 12 hours

## Reward Distribution

### When Chain Completes

1. Query `chain_paths` table
2. Filter `is_complete = true` paths (reached target)
3. For each path:
   - Calculate decay based on `subtree_frozen_until`
   - Distribute rewards along `path_participants`
4. Multiple winning paths possible (multiple routes to target)

### Decay Calculation Per Path

```typescript
function calculatePathReward(path):
    if (path.subtree_frozen_until && NOW < path.subtree_frozen_until):
        // Still frozen
        return path.current_reward

    // Calculate decay since last freeze ended
    hoursSinceJoin = (NOW - path.created_at) / 3600000

    if (path.last_child_added_at):
        // Subtract freeze period (12 hours)
        hoursSinceJoin -= 12

    decay = hoursSinceJoin * 0.001
    return max(0, path.base_reward - decay)
```

## Frontend Integration

### Display Path Rewards

In ChainVisualization, fetch paths:

```typescript
const { data: paths } = await fetch(`/api/paths/${chainId}`);

// Group by subtree
const subtrees = groupBy(paths, 'subtree_root_id');

// Show each subtree's freeze status
subtrees.forEach(subtree => {
    const isFrozen = subtree[0].is_frozen;
    const timeRemaining = subtree[0].freeze_seconds_remaining;

    // Display in UI
});
```

### RewardDecayTimer Updates

Instead of showing per-participant rewards, show per-subtree:

```tsx
<RewardDecayTimer
    subtreeId={subtreeRootId}
    paths={pathsInSubtree}
    isFrozen={isFrozen}
    freezeTimeRemaining={freezeSecondsRemaining}
/>
```

## Strategic Benefits

1. **Independent competition**: Each subtree competes separately
2. **Fair freezing**: You freeze your branch by growing it
3. **Reward distribution clarity**: Clear paths from root to target
4. **Multiple winners**: Multiple paths can reach target
5. **Efficient queries**: Paths pre-calculated, not computed on-the-fly

## Migration Steps

### 1. Run SQL Migration
```bash
cd supabase
npx supabase db push
# Applies 021_add_chain_paths_table.sql
```

### 2. Populate Existing Chains
```typescript
// For each existing chain
for (const chain of existingChains) {
    await fetch(`/api/paths/${chain.id}/update`, { method: 'POST' });
}
```

### 3. Update Node Join Logic

In `chainsApi.ts` `joinExistingChain()`:

```typescript
// After adding new participant
await fetch(`/api/paths/${chainId}/update`, { method: 'POST' });

// Freeze parent's subtree
if (parentUserId) {
    const parent = participants.find(p => p.userid === parentUserId);
    const subtreeRoot = findSubtreeRoot(parent, participants);

    await fetch(`/api/paths/${chainId}/freeze/${subtreeRoot.userid}`, {
        method: 'POST',
        body: JSON.stringify({ freezeHours: 12 })
    });
}
```

## Testing Checklist

- [ ] Path building works for complex trees
- [ ] Leaf nodes correctly identified
- [ ] Subtree freeze only affects correct paths
- [ ] Multiple subtrees remain independent
- [ ] Paths update when nodes join
- [ ] Reward decay calculated correctly per subtree
- [ ] View shows correct freeze status
- [ ] Complete paths identified when target reached

## Next Steps

1. **Run migration** (`021_add_chain_paths_table.sql`)
2. **Test path building** with sample chain data
3. **Integrate freeze API** into node join flow
4. **Update frontend** to show subtree-based rewards
5. **Add cron job** to update `current_reward` periodically (optional)