# Offer Approval Workflow Implementation

## 📋 Overview

Implemented a consent-based approval workflow for offers where targets must approve before offers appear in the marketplace.

---

## 🔄 New Workflow

### Before:
1. User creates offer → Immediately visible in marketplace
2. Anyone can bid

### Now:
1. User creates offer → Status: `pending_approval`
2. **Auto-send special message** to target connection
3. Target reviews in Messages tab
4. Target approves ✅ → Offer becomes `active` → Visible in marketplace
5. Target rejects ❌ → Offer status: `rejected` → Hidden forever

---

## 🗄️ Database Changes

### Migration File: `043_bids_to_offers_migration.sql`

**New columns in `offers` table:**
```sql
status TEXT DEFAULT 'pending_approval' CHECK (status IN (
  'pending_approval',  -- NEW: Waiting for target approval
  'draft', 
  'active',           -- Approved and live
  'paused', 
  'deleted', 
  'rejected'          -- NEW: Target declined
))

approved_by_target BOOLEAN DEFAULT FALSE
target_approved_at TIMESTAMP WITH TIME ZONE
target_rejected_at TIMESTAMP WITH TIME ZONE
```

**New columns in `offer_connections` table:**
```sql
target_organization TEXT
target_position TEXT
target_logo_url TEXT
relationship_type TEXT CHECK (...) -- former_colleague, friend, etc
relationship_description TEXT
```

---

## 🔧 Backend Implementation

### New Controller Functions

#### 1. `sendOfferApprovalMessage()`
**Purpose:** Auto-send special message when offer created

**What it does:**
- Creates a message with type: `offer_approval_request`
- Message includes:
  - Creator's name
  - Offer title
  - Action buttons metadata
- Creates notification for target
- Message appears in target's Messages tab

**Message Format:**
```
🤝 [Creator Name] wants to create an offer to introduce people to you!

📋 Offer: "[Offer Title]"

They would like to offer connections to you for networking opportunities. 
You can review and approve or decline this offer.
```

#### 2. `approveOffer()`
**Endpoint:** `POST /api/offers/:id/approve`

**Flow:**
1. Verify user is the target (connection_user_id)
2. Verify offer is `pending_approval`
3. Update offer:
   - status → `active`
   - approved_by_target → `true`
   - target_approved_at → now()
4. Send confirmation message to creator
5. Create notification for creator
6. Offer now visible in marketplace!

#### 3. `rejectOffer()`
**Endpoint:** `POST /api/offers/:id/reject`

**Flow:**
1. Verify user is the target
2. Verify offer is `pending_approval`
3. Update offer:
   - status → `rejected`
   - approved_by_target → `false`
   - target_rejected_at → now()
4. Send rejection message to creator (with optional reason)
5. Create notification for creator
6. Offer stays hidden forever

---

## 🎯 Routes Added

```typescript
POST /api/offers/:id/approve  // Target approves offer
POST /api/offers/:id/reject   // Target rejects offer (optional reason in body)
```

---

## 📱 Frontend Integration Needed

### 1. Update CreateOfferModal ✅ (Done)
- Added organization fields
- Added relationship fields
- Shows connections dropdown

### 2. Messages Tab (TODO)
Need to create special message component:

**`OfferApprovalMessage.tsx`** should display:
```
┌────────────────────────────────────┐
│ 🤝 Offer Approval Request         │
├────────────────────────────────────┤
│                                    │
│ [Creator Name] wants to create an  │
│ offer to introduce people to you!  │
│                                    │
│ 📋 Offer: "[Title]"                │
│                                    │
│ [View Details] [Approve] [Decline] │
│                                    │
└────────────────────────────────────┘
```

**Implementation:**
- Check `message_type === 'offer_approval_request'`
- Extract `offer_id` from `metadata`
- Show action buttons if not yet responded
- Call `/api/offers/:id/approve` or `/api/offers/:id/reject`

### 3. Update OffersTab (TODO)
Show pending offers differently:

```tsx
// In OffersTab.tsx

// Filter offers by status
const pendingOffers = offers.filter(o => o.status === 'pending_approval');
const activeOffers = offers.filter(o => o.status === 'active');
const rejectedOffers = offers.filter(o => o.status === 'rejected');

// Show with status badges
<Badge variant="outline">⏳ Awaiting Approval</Badge>  // pending
<Badge variant="default">✅ Active</Badge>            // active
<Badge variant="destructive">❌ Declined</Badge>      // rejected
```

### 4. Update Feed (TODO)
Only show offers with `status === 'active'`:

```typescript
const { data, error } = await supabase
  .from('offers')
  .select('*')
  .eq('status', 'active')  // Only show approved offers
  .order('created_at', { ascending: false });
```

---

## 🔐 Security & Privacy

### RLS Policies Updated

**Public can only see active offers:**
```sql
CREATE POLICY "Anyone can view active offers" ON offers
  FOR SELECT USING (status = 'active');
```

**Creator can see their own pending offers:**
```sql
CREATE POLICY "Offer creators can view their own offers" ON offers
  FOR SELECT USING (auth.uid() = offer_creator_id);
```

**Target can see offers they need to approve:**
```sql
-- Handled by messages system - target receives special message
```

---

## 📨 Message Types

### New message types:
1. `offer_approval_request` - Initial request to target
2. `offer_approval_response` - Approval/rejection confirmation

### Message metadata structure:
```json
{
  "offer_id": "uuid",
  "offer_title": "string",
  "action_required": true,
  "actions": ["approve", "reject"]
}
```

---

## 🎨 UI States

### Offer States:
1. **pending_approval** (Yellow) - "⏳ Awaiting Approval"
2. **active** (Green) - "✅ Live"
3. **rejected** (Red) - "❌ Declined"
4. **paused** (Gray) - "⏸️ Paused"
5. **deleted** (Gray) - "🗑️ Deleted"

---

## ✅ Implementation Checklist

### Backend: ✅ Complete
- [x] Add status columns to database
- [x] Create `sendOfferApprovalMessage()` function
- [x] Create `approveOffer()` endpoint
- [x] Create `rejectOffer()` endpoint
- [x] Update `createOffer()` to send approval message
- [x] Update RLS policies
- [x] Add routes

### Frontend: 🚧 Partial
- [x] Update CreateOfferModal with new fields
- [x] Update useOffers hook interface
- [ ] Create OfferApprovalMessage component
- [ ] Integrate with Messages tab
- [ ] Update OffersTab to show pending/rejected offers
- [ ] Update Feed to only show active offers
- [ ] Add approval/rejection UI

---

## 🧪 Testing Flow

1. **Create Offer:**
   ```
   POST /api/offers
   {
     "title": "Connect with VP at Google",
     "description": "...",
     "connectionUserId": "uuid",
     "price": 5000,
     "targetOrganization": "Google",
     "targetPosition": "VP of Engineering",
     "relationshipType": "former_colleague"
   }
   ```
   ✅ Offer created with status: `pending_approval`
   ✅ Message sent to target

2. **Target Checks Messages:**
   - Sees special approval request message
   - Views offer details
   - Clicks [Approve] or [Decline]

3. **Target Approves:**
   ```
   POST /api/offers/:id/approve
   ```
   ✅ Offer status → `active`
   ✅ Creator receives confirmation message
   ✅ Offer appears in marketplace

4. **Target Rejects:**
   ```
   POST /api/offers/:id/reject
   {
     "reason": "Not comfortable with this"
   }
   ```
   ✅ Offer status → `rejected`
   ✅ Creator receives rejection message
   ✅ Offer stays hidden

---

## 🎯 Next Steps

1. **Create special message component** for approval requests in Messages tab
2. **Update OffersTab** to show status badges
3. **Update Feed** to filter only active offers
4. **Add approval notifications** to notification system
5. **Test end-to-end** approval workflow

---

## 📝 Notes

- **Privacy First:** Offers only visible after target approval
- **Auto-Messaging:** Special messages sent automatically
- **No Manual Work:** Everything automated via endpoints
- **Reversible:** Creator can delete rejected offers and try again with better pitch
- **Transparent:** Both parties get notifications and messages

---

**Status:** Backend Complete | Frontend Needs Integration

