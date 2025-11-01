# AI Assistant Quick Reference

## App Structure at a Glance

### Main Pages (Standalone Routes)
```
/                   → Feed (public landing page)
/dashboard          → Dashboard home (private)
/profile            → User profile
/auth               → Login/signup
/create             → Create connection chain
/video-studio       → Video creation
/chain-invites      → Chain invitations
```

### Dashboard Tabs (Use query params: /dashboard?tab=NAME)
```
mychains    → My Chains (default)
wallet      → Wallet & credits
messages    → Direct messages
network     → My Network (connections)
people      → Discover People
offers      → My Offers (offers YOU created)
intros      → Intro call requests/bookings
```

### Feed Tabs (In-place switching, NO URL routing)
```
active          → Active connection chains
bids            → Public marketplace offers
connector       → Networking game
consultation    → AI test calls
```

## Key Distinctions

### "My Offers" vs "Offers" (Feed)
| Feature | Location | What It Shows |
|---------|----------|---------------|
| **My Offers** | `/dashboard?tab=offers` | Offers YOU created (Pending/Active/Rejected) |
| **Offers** | Feed → Offers tab | PUBLIC marketplace offers from network (book calls) |

### Navigation Types
| Type | Example | How to Navigate |
|------|---------|-----------------|
| Dashboard Tab | Messages | `/dashboard?tab=messages` |
| Standalone Page | Profile | `/profile` |
| Feed Tab | Offers | Stay on `/`, switch tab in-place |

## Common User Questions → Correct Answers

| Question | Answer | Route |
|----------|--------|-------|
| "Where are my messages?" | Dashboard → Messages tab | `/dashboard?tab=messages` |
| "Where can I see my offers?" | Dashboard → My Offers tab | `/dashboard?tab=offers` |
| "Where's the marketplace?" | Feed → Offers tab | `/` (Feed page, Offers tab) |
| "How do I check my wallet?" | Dashboard → Wallet tab | `/dashboard?tab=wallet` |
| "Where are my connections?" | Dashboard → My Network tab | `/dashboard?tab=network` |
| "How do I book an intro call?" | Feed → Offers → Book a Call | `/` (Feed, Offers tab) |
| "Where do I create an offer?" | Dashboard → My Offers → Create button | `/dashboard?tab=offers` |
| "Where are my chains?" | Dashboard (default tab) | `/dashboard` |

## AI Function Mapping

When AI suggests navigating to:

| AI Parameter | Actual Route |
|--------------|--------------|
| `messages` | `/dashboard?tab=messages` |
| `offers` | `/dashboard?tab=offers` |
| `wallet` | `/dashboard?tab=wallet` |
| `network` | `/dashboard?tab=network` |
| `mychains` | `/dashboard?tab=mychains` |
| `intros` | `/dashboard?tab=intros` |
| `people` | `/dashboard?tab=people` |
| `dashboard` | `/dashboard` |
| `profile` | `/profile` |

## Feature Workflows

### Creating an Offer
1. Go to `/dashboard?tab=offers`
2. Click "Create Offer" (blue button, top-right)
3. Fill form → Submit
4. Target approves in their Messages
5. If approved → Appears in Feed marketplace

### Booking an Intro Call
1. Go to `/` (Feed)
2. Click "Offers" tab
3. Find offer → "Book a Call"
4. Creator gets request in Messages
5. If approved → Call scheduled
6. View in `/dashboard?tab=intros`

### Messaging
1. Go to `/dashboard?tab=messages`
2. Select conversation or "New Message"
3. Type and send

### Viewing Wallet
1. Go to `/dashboard?tab=wallet`
2. See balance and transactions
3. Click "Buy Credits" to purchase

## Keyboard Shortcuts

- **Cmd+K** (Mac) or **Ctrl+K** (Windows) → Open/close AI assistant

## Important Notes

✅ **DO**
- Route dashboard features as tabs: `/dashboard?tab=messages`
- Distinguish between "My Offers" (yours) and "Offers" (marketplace)
- Keep responses short (2-3 sentences max)
- Use navigation buttons when possible

❌ **DON'T**
- Route to `/offers`, `/messages`, `/wallet` directly (these don't exist)
- Confuse "My Offers" with marketplace "Offers"
- Give long-winded explanations
- Suggest non-existent routes

## Testing Quick Check

```bash
# These should work without 404:
/dashboard
/dashboard?tab=messages
/dashboard?tab=offers
/dashboard?tab=wallet
/dashboard?tab=network
/dashboard?tab=mychains
/dashboard?tab=intros
/dashboard?tab=people
/profile
/

# These DON'T exist (will 404):
/offers
/messages
/wallet
/network
```

## When in Doubt

**Dashboard features?** → `/dashboard?tab={feature}`
**Standalone page?** → `/{page}`
**Feed content?** → Always `/`, tabs switch in-place

