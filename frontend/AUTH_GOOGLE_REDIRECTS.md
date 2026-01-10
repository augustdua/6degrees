# Google sign-in redirect (Supabase) — required settings

Your app uses **Supabase Auth (PKCE)** and intentionally redirects the browser back to:

- `https://zaurq.com/auth/callback`

That callback route (`frontend/src/pages/AuthCallback.tsx`) exchanges the `code` for a session and then redirects users to the feed/home experience.

## Supabase Dashboard

In **Supabase → Authentication → URL Configuration**:

- **Site URL**: `https://zaurq.com`
- **Additional Redirect URLs** (must include):
  - `https://zaurq.com/auth/callback`
  - (optional for local dev) `http://localhost:5173/auth/callback` (or whatever your dev origin is)

## Google Cloud Console (OAuth Client)

In **Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client**:

- **Authorized JavaScript origins**:
  - `https://zaurq.com`
- **Authorized redirect URIs**:
  - Use the **Supabase** Google provider callback shown in your Supabase dashboard (this is not the same as `/auth/callback`).

Notes:
- The browser first returns to your app at `/auth/callback`.
- Supabase still requires its own Google provider callback URL to be configured in Google Cloud Console.


