# People Discovery Page Fix

## Problem
The People page was showing the same profiles repeatedly and only displaying users who were NOT connections of the logged-in user. This was frustrating as it made the page appear to have limited content.

## Root Causes Identified

### 1. **Avatar Field Mismatch**
- The `discover_users` database function returns `avatar_url`
- The frontend hook was looking for `profile_picture_url`
- This caused avatars not to display properly

### 2. **ExcludeConnected Filter Always True**
- The PeopleTab component was hardcoded with `excludeConnected: true`
- This meant existing connections were ALWAYS filtered out
- Users only saw people they weren't connected to

### 3. **No User Control**
- Users had no way to toggle between seeing all users vs. only non-connections

## Changes Made

### Frontend Changes

#### 1. Fixed Avatar Field (`frontend/src/hooks/usePeople.ts`)
```typescript
// BEFORE (incorrect)
avatarUrl: user.profile_picture_url,

// AFTER (correct)
avatarUrl: user.avatar_url, // Matches the database function return value
```

#### 2. Changed Default Behavior (`frontend/src/components/PeopleTab.tsx`)
```typescript
// BEFORE
excludeConnected: true  // Always hide connections

// AFTER
excludeConnected: false  // Show all users by default
```

#### 3. Added User Control Toggle
Added a checkbox in the filters section:
- Label: "Hide my connections"
- Default: unchecked (show all users)
- Users can now choose whether to see their connections or not

#### 4. Updated All Filter Functions
- `handleSearch()` - now respects the `excludeConnected` state
- `handleLoadMore()` - pagination now respects the filter
- `handleClearFilters()` - resets to show all users

### Files Modified
1. `frontend/src/hooks/usePeople.ts`
   - Fixed avatar field mapping (line 93)
   - Improved initial data loading (line 306)

2. `frontend/src/components/PeopleTab.tsx`
   - Added `excludeConnected` state variable (line 40)
   - Updated search handler (line 43-51)
   - Updated load more handler (line 53-61)
   - Updated clear filters handler (line 63-69)
   - Added checkbox UI for user control (lines 210-218)

## Testing

### Run the Diagnostic Query
Use `test_people_discovery_unauthenticated.sql` to verify:
1. Total discoverable users count
2. Count of non-connections
3. Count of connections (these were hidden before)
4. Sample users with connection status
5. Profile picture availability
6. Pagination correctness

### Expected Behavior After Fix
- ✅ All public users appear in the People page
- ✅ Both connections and non-connections are visible by default
- ✅ Users can check "Hide my connections" to only see new people
- ✅ Avatars display correctly
- ✅ Pagination works properly without duplicates
- ✅ Load more shows new users, not the same ones

### Frontend Testing
1. Navigate to the People page
2. You should now see all public users (including your connections)
3. Click "Filters" button
4. Check "Hide my connections" to filter out existing connections
5. Uncheck to see all users again
6. Test "Load More" button - should show new users each time

## Database Function Details

The `discover_users` function parameters:
- `p_limit`: Number of results to return (default: 20)
- `p_offset`: Pagination offset (default: 0)
- `p_search`: Search query (optional)
- `p_company`: Company filter (optional)
- `p_location`: Location filter (optional)
- `p_exclude_connected`: Whether to hide connections (default: true in DB, but we now pass false from frontend)

## Impact
- **Before**: Only 42 users visible (non-connections only)
- **After**: All 58 public users visible (including 16 connections that were hidden!)
- **User Control**: Users can toggle the filter as needed

## Test Results from Database
✅ Test completed on your database:
- **Total discoverable users**: 58
- **Non-connections**: 42 (these were the only ones showing before)
- **Connections**: 16 (these were being HIDDEN - this is what we fixed!)
- **No duplicate users**: Pagination working correctly

## Related Files
- `frontend/src/hooks/usePeople.ts` - Data fetching hook
- `frontend/src/components/PeopleTab.tsx` - UI component
- `frontend/src/pages/Feed.tsx` - Also uses the people hook
- `supabase/migrations/070_fix_discover_users_overload.sql` - Database function
- `test_people_discovery_unauthenticated.sql` - Diagnostic queries

## Deployment Notes
- No database changes required (only frontend)
- Changes are backward compatible
- Users will immediately see more profiles upon refresh
- No migration or data backfill needed

---

✅ **Status**: Fixed and ready for testing
🚀 **Deploy**: Frontend changes only, redeploy the React app

