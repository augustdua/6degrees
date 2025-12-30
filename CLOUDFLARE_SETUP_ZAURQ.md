# Cloudflare Setup Guide for Zaurq.com

## Problem
Jio mobile users and other IPv6-first networks experience connectivity issues because zaurq.com lacks IPv6 (AAAA) DNS records. Cloudflare provides dual-stack (IPv4 + IPv6) support automatically.

## Current Setup
- **Frontend**: `zaurq.com` ✅ **Already proxied through Cloudflare** (orange cloud)
- **Backend**: Railway (`6degreesbackend-production.up.railway.app`) ❌ Not proxied yet
- **Goal**: Add backend behind Cloudflare for IPv6 support and protection

## What You Need to Do

**Only the backend needs to be added** - your frontend is already proxied! ✅

### Steps:

1. **Add `api.zaurq.com` as a custom domain in Railway**
   - Go to your Railway project → Settings → Domains
   - Add custom domain: `api.zaurq.com`
   - Railway will provide DNS verification instructions

2. **Add CNAME record in Cloudflare**
   - In Cloudflare DNS, add: `api.zaurq.com` → `6degreesbackend-production.up.railway.app` (or Railway's provided domain)
   - **Enable proxy** (orange cloud ☁️) for this record

3. **Update frontend to use `api.zaurq.com`**
   - Set `VITE_BACKEND_URL=https://api.zaurq.com` in your frontend environment variables

### Benefits of Adding Backend Behind Cloudflare:

- ✅ IPv6 support (critical for Jio users and IPv6-first networks)
- ✅ DDoS protection for API endpoints
- ✅ SSL/TLS termination
- ✅ Better global performance
- ✅ Unified security policies with frontend

## Solution: Cloudflare Dual-Stack (IPv4 + IPv6)

Cloudflare will automatically provide IPv6 connectivity by:
1. Adding AAAA records for your domains
2. Acting as a reverse proxy (IPv6 ↔ IPv4)
3. No changes needed to your backend infrastructure

---

## Step-by-Step Setup

### Phase 1: Add Custom Domain in Railway

1. **Go to Railway Dashboard**
   - Navigate to your backend service/project
   - Go to **Settings** → **Domains** (or **Networking** → **Custom Domains**)

2. **Add Custom Domain**
   - Click **"Add Custom Domain"** or **"+ Add Domain"**
   - Enter: `api.zaurq.com`
   - Railway will show you:
     - A CNAME target to point to (e.g., `cname.railway.app`)
     - OR instructions to point to your existing Railway URL

3. **Note the Railway domain/target**
   - Copy the CNAME target Railway provides
   - You'll need this for Cloudflare DNS

### Phase 2: Add DNS Record in Cloudflare

4. **Go to Cloudflare DNS**
   - Navigate to your `zaurq.com` domain in Cloudflare
   - Go to **DNS** → **Records**

5. **Add CNAME Record for Backend**
   - Click **"+ Add record"**
   - **Type**: CNAME
   - **Name**: `api`
   - **Target**: The Railway domain/target from Step 3 (e.g., `6degreesbackend-production.up.railway.app` or Railway's CNAME target)
   - **Proxy status**: Click the gray cloud to turn it **orange** (Proxied) ☁️
   - Click **Save**

   **IMPORTANT**: Make sure the cloud icon is **orange** (proxied), not gray!

6. **Verify DNS Record**
   - You should now see:
     ```
     Type   Name           Content                                    Proxy  TTL
     CNAME  api.zaurq.com  6degreesbackend-production.up.railway.app  ✅ Yes  Auto
     ```

### Phase 3: Update Frontend Configuration

7. **Update Frontend Environment Variable**
   - In your frontend deployment (Lovable/Vercel/etc), set:
     ```
     VITE_BACKEND_URL=https://api.zaurq.com
     ```
   - This makes your frontend use the proxied API domain
   - Redeploy frontend if needed

### Phase 4: Configure Cloudflare Settings

8. **SSL/TLS Settings** (if not already configured)
   - Go to SSL/TLS → Overview
   - Set encryption mode to **"Full"** or **"Full (strict)"**
   - This ensures HTTPS works between Cloudflare ↔ Railway backend

9. **Enable IPv6 Compatibility** (should already be ON)
   - Go to Network settings
   - Ensure "IPv6 Compatibility" is **ON** (it's usually on by default)

### Phase 5: Verify Setup

10. **Test Backend API** (after DNS propagation, usually 5-30 minutes)
    ```bash
    # Test the new API domain
    curl -I https://api.zaurq.com/health
    
    # Should return HTTP 200
    ```

11. **Test IPv6 connectivity** (after DNS propagation)
    ```bash
    # Should now return an IPv6 address (AAAA record)
    curl -6 -I https://api.zaurq.com
    
    # Should also work with IPv4
    curl -4 -I https://api.zaurq.com
    ```

12. **Test from multiple locations**
    - Use online tools:
      - https://www.whatsmydns.net/ (check AAAA records for `api.zaurq.com`)
      - https://dnschecker.org/ (verify DNS propagation)
      - https://ipv6-test.com/ (test IPv6 connectivity)

13. **Test Frontend → Backend Connection**
    - Open https://zaurq.com in browser
    - Open browser DevTools → Network tab
    - Verify API calls are going to `https://api.zaurq.com` (not Railway URL)
    - Check that requests succeed

14. **Test on Jio mobile network** (or any IPv6-first network)
    - Open https://zaurq.com on a Jio mobile connection
    - Should load without issues, including API calls

---

## DNS Configuration Reference

After setup, your Cloudflare DNS should look like this:

```
Type   Name              Content                                    Proxy  TTL
CNAME  zaurq.com         r4z6yqod.up.railway.app                   ✅ Yes  Auto (already set)
CNAME  api.zaurq.com     6degreesbackend-production.up.railway.app ✅ Yes  Auto (NEW)
```

**Note**: 
- `zaurq.com` is already proxied (you can see this in your Cloudflare dashboard)
- `api.zaurq.com` is the new record you're adding
- Cloudflare automatically creates AAAA records when proxy is enabled
- You don't need to manually add AAAA records

---

## Expected Results

### Before Adding Backend to Cloudflare:
```bash
$ curl -6 -I https://api.zaurq.com
curl: (6) Could not resolve host: api.zaurq.com
# OR if domain exists but not proxied:
# Works but no IPv6 support, no DDoS protection
```

### After Adding Backend to Cloudflare:
```bash
$ curl -6 -I https://api.zaurq.com
HTTP/2 200
date: Sun, 12 Oct 2025 ...
content-type: application/json
...
```

**Note**: Frontend (`zaurq.com`) already works with IPv6 since it's already proxied.

---

## Additional Benefits

Beyond IPv6, Cloudflare provides:

1. **Performance**: Global CDN with edge caching
2. **Security**: DDoS protection, Web Application Firewall (WAF)
3. **Reliability**: Always-online mode if origin goes down
4. **Analytics**: Traffic insights and bot detection
5. **SSL**: Free SSL certificates with automatic renewal

---

## Troubleshooting

### Issue: DNS not propagating
- **Solution**: Wait 24-48 hours, or flush DNS cache locally:
  ```bash
  # Windows
  ipconfig /flushdns
  
  # Mac
  sudo dscacheutil -flushcache
  
  # Linux
  sudo systemd-resolve --flush-caches
  ```

### Issue: "Too many redirects" error
- **Solution**: Change SSL mode to "Full" (not "Flexible")
  - Cloudflare → SSL/TLS → Overview → Full

### Issue: API calls failing with CORS errors
- **Solution**: Ensure backend CORS includes `https://zaurq.com`
  - Backend solution: Update CORS origins (see below)
  - Cloudflare solution: Rules → Transform Rules → Modify Response Header

### Issue: Railway backend not reachable
- **Solution**: Ensure Railway allows Cloudflare IPs
  - Railway automatically allows Cloudflare
  - No action needed

---

## Verification Commands

Run these after setup:

```bash
# Check for AAAA record (IPv6)
nslookup -type=AAAA zaurq.com

# Test IPv6 connectivity
curl -6 -I https://zaurq.com

# Test IPv4 connectivity (should still work)
curl -4 -I https://zaurq.com

# Check all DNS records
dig zaurq.com ANY

# Verify from Cloudflare's DNS
nslookup zaurq.com 1.1.1.1
```

---

## Timeline

- **Immediate**: Add custom domain in Railway (2-3 minutes)
- **Immediate**: Add CNAME record in Cloudflare (1-2 minutes)
- **5-30 minutes**: DNS propagation for `api.zaurq.com`
- **Within 1 hour**: Full DNS propagation worldwide
- **Within 24 hours**: All users (including Jio) can access backend via IPv6

**Note**: Since your frontend is already proxied, it already has IPv6 support. This setup adds the same benefits to your backend API.

---

## Questions?

If you encounter issues:
1. Check Cloudflare dashboard → Analytics → DNS for query stats
2. Use Cloudflare's "Trace" tool to debug routing
3. Contact Cloudflare support (even free tier has community support)

---

**Status**: Ready to implement
**Priority**: HIGH (affects IPv6-first network users)
**Effort**: 30 minutes setup + 24-48 hours propagation
**Risk**: LOW (can revert by changing nameservers back)

