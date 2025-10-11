#!/bin/bash

# Git commands to commit and deploy user isolation fixes

# Initialize git if not already done (skip if already initialized)
# git init
# git remote add origin <your-repo-url>

# Stage the changed files
git add backend/src/controllers/requestController.ts
git add frontend/src/components/VideoUploader.tsx
git add supabase/migrations/036_add_storage_rls_for_user_videos.sql
git add .gitignore

# Stage documentation (optional, but recommended)
git add FIX-USER-ISOLATION.md
git add STORAGE-POLICIES-SETUP.md

# Commit the changes
git commit -m "feat: implement user isolation for videos and avatars

- Add user-specific folders for video/thumbnail uploads (request-videos/{userId}/)
- Update avatar fetching to only return user's own avatars from their HeyGen group
- Add storage RLS policies documentation for bucket access control
- Update VideoUploader to include user authentication check
- Prevent cross-user avatar visibility by filtering by heygen_avatar_group_id

Fixes: Users seeing other users' avatars and videos
Security: Enforces user isolation at storage and API levels"

# Push to your remote repository
# git push origin main
# Or if you use a different branch:
# git push origin your-branch-name

echo "✅ Changes committed!"
echo ""
echo "Next steps:"
echo "1. Push to your repo: git push origin main"
echo "2. Deploy backend to your hosting service"
echo "3. Deploy frontend to your hosting service"
echo "4. Create storage policies in Supabase Dashboard (see STORAGE-POLICIES-SETUP.md)"

