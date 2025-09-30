# Reward Decay System Implementation

## Overview
Implemented a time-based reward decay system with freeze mechanics to incentivize rapid chain growth.

## Decay Mechanics

### Rate
- **0.001 per hour** (2.4% per day)
- Updates calculated every 60 seconds on frontend
- Backend calculates decay in real-time when queried

### Formula
```
effectiveHours = hoursSinceJoined - frozenHours
decayAmount = effectiveHours × 0.001
currentReward = max(0, baseReward - decayAmount)
```

### Freeze Mechanic
- **Duration**: 12 hours
- **Trigger**: When a user adds a child node to the chain
- **Effect**: Pauses decay for the parent node
- Rewards action over just speed

## Data Structure

### ChainParticipant Fields
```typescript
{
  baseReward?: number;          // Original reward (set when chain completes)
  lastChildAddedAt?: string;    // Timestamp of last child addition
  freezeUntil?: string;          // Timestamp until decay is frozen
}
```

## Implementation Files

### Frontend
1. **`frontend/src/lib/chainsApi.ts`**
   - Added decay/freeze fields to ChainParticipant interface
   - `calculateCurrentReward()` - Client-side decay calculation
   - `getRemainingFreezeTime()` - Get freeze time remaining
   - `isRewardFrozen()` - Check if reward is frozen
   - Auto-freezes parent when child joins (12 hours)

2. **`frontend/src/components/RewardDecayTimer.tsx`**
   - Mobile-responsive UI component
   - Shows current reward (5 decimals)
   - Displays freeze status with countdown
   - Updates every 60 seconds
   - Freeze state: ❄️ FROZEN with time remaining
   - Decay state: 🔥 Decaying with rate

3. **`frontend/src/components/UserProfileModal.tsx`**
   - Integrated RewardDecayTimer
   - Shows timer when participant + baseReward available
   - Mobile-optimized layout

4. **`frontend/src/components/ChainVisualization.tsx`**
   - Passes participant data and baseReward to modal
   - Calculates baseReward from chain.totalReward / participants.length

### Backend
1. **`backend/src/controllers/chainController.ts`**
   - `calculateRewardWithDecay()` - Server-side decay calculation
   - `getChainWithRewards()` - API endpoint for chains with real-time rewards
   - Returns participants with `currentReward` and `decayActive` status

2. **`backend/src/routes/chains.ts`**
   - `GET /api/chains/:chainId/rewards` - Fetch chain with calculated rewards

## UI/UX

### Desktop
```
┌─────────────────────────────────┐
│ Current Reward: 0.97234 ETH ⏱️  │
│ ❄️ FROZEN for 8h 23m            │
│ (Added child node 3h 37m ago)   │
└─────────────────────────────────┘
```

### Mobile
```
┌──────────────────────────┐
│ Current Reward:          │
│ 0.97234 ETH              │
│                          │
│ ❄️ FROZEN                │
│ 8h 23m remaining         │
└──────────────────────────┘
```

### Decay State
```
┌──────────────────────────┐
│ Current Reward:          │
│ 0.84521 ETH              │
│                          │
│ 🔥 Decaying (-0.001/hr)  │
│ ⚠️ Add a child to freeze!│
└──────────────────────────┘
```

## Strategic Benefits

1. **Creates urgency** - Rewards decay over time, motivating fast action
2. **Rewards action** - Freeze mechanic rewards users who actively build chains
3. **Prevents gaming** - Can't just spam invites and walk away
4. **Compound effect** - Children also face decay, creating cascading urgency
5. **Fair timing** - 2.4%/day gives ~7 days before 50% loss (enough time but still urgent)

## Testing Checklist

- [ ] Decay calculation accuracy (frontend matches backend)
- [ ] Freeze triggers correctly when child added
- [ ] Freeze duration exactly 12 hours
- [ ] Timer updates every 60 seconds
- [ ] Mobile responsive design
- [ ] Shows correct decimal places (5)
- [ ] Handles edge cases (no reward, frozen past end, etc.)
- [ ] Real-time updates in profile modal

## Future Enhancements

1. **Visual decay on graph** - Show decaying nodes with color/animation
2. **Push notifications** - Alert when freeze expires
3. **Decay rate tiers** - Different rates for different chain depths
4. **Reward multipliers** - Bonus for rapid chain completion
5. **Analytics dashboard** - Track decay impact on conversion rates