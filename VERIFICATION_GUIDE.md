# 🎯 Offers System Verification Guide

## 📋 Overview

This guide helps you verify the complete offers system migration and test the end-to-end workflow.

---

## 📁 Verification Files Created

### 1. **`supabase/migrations/verify_offers_system.sql`**
**Purpose:** Automated verification of database structure and integrity

**What it checks:**
- ✅ All tables exist (offers, offer_connections, offer_bids, offer_availability, offer_likes, intros)
- ✅ Required columns present (including new approval and organization fields)
- ✅ Constraints properly configured (status, price, approval fields)
- ✅ Foreign keys set up correctly
- ✅ Indexes created for performance
- ✅ RLS policies active
- ✅ Triggers and functions working
- ✅ Data statistics and summaries

**How to run:**
```sql
-- In Supabase SQL Editor or psql
\i supabase/migrations/verify_offers_system.sql
```

**Expected output:**
- All checks should show `✅ PASS`
- Any `❌ FAIL` or `⚠️ WARNING` should be investigated
- Final summary with table sizes and record counts

---

### 2. **`supabase/migrations/test_offer_workflow.sql`**
**Purpose:** Step-by-step manual testing of the complete workflow

**What it tests:**
1. **Offer Creation** → Status: `pending_approval`
2. **Approval Request** → Auto-message sent
3. **Target Approval** → Status: `active`
4. **Marketplace Visibility** → Offer appears in feed
5. **Bidding** → Buyers can place bids
6. **Bid Acceptance** → Creator accepts bid
7. **Intro Scheduling** → Meeting scheduled
8. **Rejection Flow** → Test rejection path

**How to run:**
```sql
-- IMPORTANT: Edit the file first!
-- Replace all placeholder IDs:
-- - REPLACE_WITH_CREATOR_USER_ID
-- - REPLACE_WITH_CONNECTION_USER_ID  
-- - REPLACE_WITH_BUYER_USER_ID
-- - COPY_OFFER_ID_HERE (after creating offer)
-- - COPY_BID_ID_HERE (after creating bid)

-- Then run section by section in Supabase SQL Editor
```

**Best Practice:**
- Run each section separately
- Verify results after each step
- Use actual user IDs from your database
- Check that users are connected before creating offers

---

### 3. **`supabase/queries/offers_common_queries.sql`**
**Purpose:** Reference library of frequently-used queries

**What's included:**
- **Public Feed Queries** (marketplace display)
- **My Offers Queries** (dashboard)
- **Bids Queries** (manage bids)
- **Intros Queries** (scheduled meetings)
- **User Connections** (for offer creation)
- **Likes Queries** (offer engagement)
- **Statistics Queries** (analytics)
- **Search & Filter** (marketplace features)
- **Approval Workflow** (approve/reject)

**How to use:**
```sql
-- Copy queries and replace placeholders:
:current_user_id → Your user UUID
:offer_id → Specific offer UUID
:search_query → Search term
:min_price / :max_price → Price range
:organization_query → Company name
```

---

## 🔄 Complete End-to-End Flow

### **Workflow Diagram**

```
┌─────────────────────────────────────────────────────────────┐
│ 1. OFFER CREATION                                           │
│    • User creates offer for their 1st-degree connection     │
│    • Status: 'pending_approval'                             │
│    • Organization details added                             │
│    • Relationship info included                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. AUTO-MESSAGE SENT                                        │
│    • Special message created automatically                  │
│    • Type: 'offer_approval_request'                         │
│    • Notification sent to target                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. TARGET REVIEWS (in Messages tab)                         │
│    • Target sees approval request                           │
│    • Reviews offer details                                  │
│    • Options: [Approve] or [Decline]                        │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
    [APPROVE]              [DECLINE]
         │                       │
         │                       ▼
         │              Status: 'rejected'
         │              Hidden from feed
         │              Creator notified
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. OFFER ACTIVATED                                          │
│    • Status: 'active'                                       │
│    • approved_by_target: true                               │
│    • Visible in marketplace                                 │
│    • Creator notified                                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. BIDDING PHASE                                            │
│    • Buyers see offer in feed                               │
│    • Place bids (can exceed asking price)                   │
│    • Multiple bids allowed                                  │
│    • Bids status: 'pending'                                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. BID ACCEPTANCE                                           │
│    • Creator reviews bids                                   │
│    • Accepts winning bid                                    │
│    • Bid status: 'accepted'                                 │
│    • Other bids can be rejected                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. INTRO SCHEDULED                                          │
│    • 3-way call scheduled                                   │
│    • Participants: Buyer + Creator + Connection            │
│    • AI Copilot joins (Pipecat)                             │
│    • Daily.co room created                                  │
│    • Status: 'scheduled'                                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. INTRO CALL                                               │
│    • All participants join Daily.co room                    │
│    • AI Copilot moderates                                   │
│    • Transcript recorded                                    │
│    • Status: 'completed'                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧪 Testing Checklist

### Pre-Migration
- [ ] Backup your database
- [ ] Run migration on staging first
- [ ] Verify no active transactions

### Post-Migration
- [ ] Run `verify_offers_system.sql`
- [ ] Check all ✅ PASS results
- [ ] Investigate any ❌ FAIL or ⚠️ WARNING
- [ ] Verify existing data migrated correctly

### Workflow Testing
- [ ] Create test offer (pending_approval)
- [ ] Verify approval message sent
- [ ] Approve offer (status → active)
- [ ] Verify offer visible in feed
- [ ] Place test bid
- [ ] Accept bid
- [ ] Schedule intro (if applicable)
- [ ] Test rejection flow
- [ ] Clean up test data

### Backend API Testing
- [ ] `POST /api/offers` - Create offer
- [ ] `GET /api/offers/my/offers` - Get my offers
- [ ] `POST /api/offers/:id/approve` - Approve offer
- [ ] `POST /api/offers/:id/reject` - Reject offer
- [ ] `POST /api/offers/:id/bid` - Place bid
- [ ] `GET /api/offers/:id/bids` - Get bids
- [ ] `POST /api/offers/:offerId/bids/:bidId/accept` - Accept bid
- [ ] `GET /api/offers/my/intros` - Get my intros

### Frontend UI Testing
- [ ] Create offer modal works
- [ ] Connection dropdown populates
- [ ] Organization fields required
- [ ] Offers tab shows pending/active offers
- [ ] Bids panel displays correctly
- [ ] Intros tab shows scheduled calls
- [ ] Approval messages appear
- [ ] Status badges correct

---

## 🔍 Key Things to Verify

### 1. **Offer Creation**
```sql
-- Should have these fields populated:
SELECT 
  id,
  offer_creator_id,
  connection_user_id,
  status,                    -- Should be 'pending_approval'
  approved_by_target,        -- Should be FALSE
  target_approved_at,        -- Should be NULL
  target_rejected_at         -- Should be NULL
FROM offers
WHERE id = 'YOUR_OFFER_ID';
```

### 2. **Organization Details**
```sql
-- Should have organization info:
SELECT 
  offer_id,
  target_organization,       -- e.g., 'Google'
  target_position,           -- e.g., 'VP of Engineering'
  target_logo_url,           -- Logo URL
  relationship_type,         -- e.g., 'former_colleague'
  relationship_description   -- Description
FROM offer_connections
WHERE offer_id = 'YOUR_OFFER_ID';
```

### 3. **Approval Workflow**
```sql
-- After approval, should have:
SELECT 
  status,                    -- Should be 'active'
  approved_by_target,        -- Should be TRUE
  target_approved_at         -- Should have timestamp
FROM offers
WHERE id = 'YOUR_OFFER_ID';
```

### 4. **Marketplace Visibility**
```sql
-- Only active offers should appear:
SELECT COUNT(*) 
FROM offers 
WHERE status = 'active';     -- Public can see these

SELECT COUNT(*) 
FROM offers 
WHERE status = 'pending_approval';  -- Hidden from public
```

---

## 🐛 Common Issues & Solutions

### Issue: "Column does not exist"
**Solution:** Migration not fully applied. Re-run migration with idempotent checks.

### Issue: "Policy prevents access"
**Solution:** Check RLS policies. Make sure authenticated users have proper permissions.

### Issue: "Foreign key violation"
**Solution:** Ensure users are connected before creating offers. Check `user_connections` table.

### Issue: "Check constraint violation"
**Solution:** Verify `asking_price_inr >= 100` and `status` is valid enum value.

### Issue: "Intros table does not exist"
**Solution:** Expected if you don't have intro_calls table. System works without it.

---

## 📊 Expected Results Summary

After running all verification scripts, you should see:

| Component | Expected Result |
|-----------|----------------|
| Tables | 6 tables exist (5 required + 1 optional intros) |
| Columns | All required fields present including approval & org fields |
| Constraints | Status includes pending_approval & rejected |
| Foreign Keys | All relationships properly configured |
| Indexes | 10+ indexes for performance |
| RLS Policies | 15+ policies protecting data access |
| Triggers | 4 triggers for stats updates |
| Functions | 4 functions for business logic |

---

## 🎉 Success Criteria

Your system is working correctly if:

1. ✅ All verification checks pass
2. ✅ Can create offer with organization details
3. ✅ Offer starts as `pending_approval`
4. ✅ Target can approve/reject via API
5. ✅ Approved offers appear in feed
6. ✅ Rejected offers stay hidden
7. ✅ Bids can be placed and accepted
8. ✅ Intros can be scheduled (if applicable)
9. ✅ RLS policies enforce access control
10. ✅ No backend errors in logs

---

## 📞 Support

If you encounter issues:

1. Check the verification output for `❌ FAIL` items
2. Review migration logs for errors
3. Verify user connections exist
4. Test with different user roles
5. Check backend API logs
6. Verify frontend network requests

---

**Created:** $(date)  
**Migration:** `043_bids_to_offers_migration.sql`  
**System:** 6Degrees Offers Platform

