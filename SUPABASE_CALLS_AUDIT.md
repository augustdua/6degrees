# Supabase Direct Calls Audit

## Files with Supabase RPC/Query Calls (excluding auth & infrastructure)

### ✅ ALREADY FIXED:
1. `usePeople.ts` - ✅ Uses backend `/api/users/discover`
2. `useNotificationCounts.ts` - ✅ Uses backend `/api/notifications/counts`
3. `UserCard.tsx` - ✅ Uses backend `/api/profile/:userId`
4. `MessagesTab.tsx` - ✅ Uses backend `/api/messages/mark-read`
5. `ChatModal.tsx` - ✅ Uses backend `/api/messages/conversation/:id`
6. `Dashboard.tsx` - ✅ Uses backend `/api/requests/:id/soft-delete`

### ⏳ TODO:
7. `useConnections.ts` - Line 37, 81: `supabase.rpc('get_user_connections')`
   - **Action**: Create backend endpoint `/api/connections`
   
8. `useInvites.ts` - Line 94: `supabase.rpc('create_invite_notification')`
   - **Action**: Create backend endpoint `/api/invites/notify`
   
9. `useMessages.ts` - Check for direct calls
   
10. `useTargetClaims.ts` - Check for direct calls
   
11. `useAnalytics.ts` - Check for direct calls
   
12. `PerksTab.tsx` - Check for direct calls
   
13. `GroupChatModal.tsx` - Check for direct calls
   
14. `ChainInvitesDashboard.tsx` - Check for direct calls

### ✅ EXCLUDED (Infrastructure - OK to keep Supabase):
- `lib/supabase.ts` - Supabase client initialization
- `lib/api.ts` - API helpers (uses Supabase for auth token)
- `lib/authSession.ts` - Auth session management
- `lib/bootstrap.ts` - App initialization
- `useAuth.ts` - Authentication hook (needs direct Supabase auth)

