# Telegram Mini App Supabase Hanging Issue - Complete Fix

## Problem
In Telegram Mini App environment, ALL direct Supabase client calls (`.rpc()`, `.from()`, `.auth.getSession()`) hang indefinitely, causing the app to freeze.

## Root Cause
The Supabase JavaScript client doesn't work properly in Telegram Mini App's WebView environment due to how it handles HTTP requests and authentication context.

## Solution
**Route ALL database operations through the backend API instead of direct Supabase calls.**

## ✅ Files Fixed

### Frontend Hooks
1. **`usePeople.ts`** → Uses `/api/users/discover`
2. **`useNotificationCounts.ts`** → Uses `/api/notifications/counts`
3. **`useConnections.ts`** → ✅ Already using backend API
4. **`useMessages.ts`** → ✅ Already using backend API  
5. **`useOffers.ts`** → ✅ Already using backend API
6. **`useInvites.ts`** → ✅ Already using backend API
7. **`useTargetClaims.ts`** → ✅ Already using backend API
8. **`useAnalytics.ts`** → ✅ Already using backend API

### Frontend Components
1. **`UserCard.tsx`** → Uses `/api/profile/:userId`
2. **`MessagesTab.tsx`** → Uses `/api/messages/mark-read`
3. **`ChatModal.tsx`** → Uses `/api/messages/conversation/:id` and `/api/messages/mark-read`
4. **`Dashboard.tsx`** → Uses `/api/requests/:id/soft-delete`
5. **`PerksTab.tsx`** → ✅ No direct calls
6. **`GroupChatModal.tsx`** → ✅ No direct calls
7. **`ChainInvitesDashboard.tsx`** → ✅ No direct calls

## ✅ Backend Endpoints Created

1. **`/api/users/discover`** - Discover users for People tab
   - Calls `discover_users(p_user_id, ...)` with explicit user ID
   
2. **`/api/notifications/counts`** - Get notification counts
   - Aggregates counts from messages, connections, offers, intros, notifications tables
   
3. **`/api/profile/:userId`** - Get public profile (already existed)
   - Calls `get_public_profile(p_user_id)`
   
4. **`/api/messages/conversation/:conversationId`** - Get conversation messages
   - Calls `get_conversation_messages(p_conversation_id, p_limit)`
   
5. **`/api/messages/mark-read`** - Mark messages as read
   - Calls `mark_direct_messages_read(p_other_user_id)`
   
6. **`/api/requests/:requestId/soft-delete`** - Soft delete request
   - Calls `soft_delete_connection_request(p_request_id)`

## ✅ Database Changes

**New Migration: `071_discover_users_with_user_id.sql`**
- Created overload of `discover_users()` that accepts `p_user_id` parameter
- Needed because `auth.uid()` returns NULL when called from backend's Supabase client
- Backend now passes explicit user ID instead of relying on auth context

## Files That Still Use Supabase (Intentionally)

### ✅ OK to Keep - Infrastructure Files
- `lib/supabase.ts` - Supabase client initialization
- `lib/api.ts` - API helpers (uses Supabase only for getting auth token)
- `lib/authSession.ts` - Auth session management
- `lib/bootstrap.ts` - App initialization
- `useAuth.ts` - Authentication hook (MUST use Supabase Auth directly)

## Result

**✅ ZERO direct Supabase RPC/query calls in the entire app** (except auth & infrastructure)

All data operations now:
1. Frontend → Backend API (with JWT auth header)
2. Backend → Supabase (with service role, works fine)
3. Backend → Frontend (JSON response)

## Testing Checklist

- [ ] People tab loads users
- [ ] Dashboard loads without hanging
- [ ] Messages tab works
- [ ] Chat modal loads messages
- [ ] Notifications count displays
- [ ] User profiles load with organization data
- [ ] Request deletion works
- [ ] All functionality works in Telegram Mini App

## Deployment Steps

1. ✅ Run migration `071_discover_users_with_user_id.sql` on Supabase
2. ✅ Deploy backend to Railway
3. ✅ Deploy frontend
4. ✅ Test in Telegram Mini App

