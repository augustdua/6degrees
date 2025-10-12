# Quick IPv6 Setup Checklist

## 🎯 Goal
Fix Jio mobile connectivity by adding IPv6 support via Cloudflare

## ✅ Quick Steps (30 minutes)

### 1. Cloudflare Account Setup
- [ ] Sign up at https://dash.cloudflare.com/sign-up (Free plan)
- [ ] Click "Add Site" → Enter `6degree.app`
- [ ] Select Free plan → Continue

### 2. DNS Configuration
- [ ] Review auto-detected DNS records
- [ ] **CRITICAL**: Enable "Proxied" (orange cloud ☁️) for:
  - [ ] `6degree.app`
  - [ ] `www.6degree.app` (add if missing)
  - [ ] `share.6degree.app`
  - [ ] `api.6degree.app`

### 3. Update Nameservers
- [ ] Copy Cloudflare nameservers (shown in dashboard)
- [ ] Go to your domain registrar (GoDaddy/Namecheap/etc)
- [ ] Replace existing nameservers with Cloudflare's
- [ ] Save changes

### 4. Configure SSL/TLS
- [ ] Go to SSL/TLS → Overview
- [ ] Set mode to **"Full"** (not Flexible!)
- [ ] Verify "IPv6 Compatibility" is ON (Network settings)

### 5. Verify (after 1-24 hours)
- [ ] Test: `curl -6 -I https://6degree.app`
- [ ] Should return HTTP 200, not "Could not resolve host"
- [ ] Test on Jio mobile network
- [ ] Check https://www.whatsmydns.net/ for AAAA records

## 🚨 Common Issues

**"Too many redirects"**
→ Set SSL mode to "Full" (not Flexible)

**DNS not working**
→ Wait 24 hours for propagation

**API CORS errors**
→ Already handled in backend, should work fine

## 📊 Success Criteria

Before: `curl -6 -I https://6degree.app` → ❌ "Could not resolve host"
After: `curl -6 -I https://6degree.app` → ✅ HTTP/2 200

## 🔗 Full Documentation
See `IPV6_CLOUDFLARE_SETUP.md` for detailed guide

## ⏱️ Timeline
- Setup: 30 minutes
- DNS Propagation: 1-24 hours (usually < 4 hours)
- Full global propagation: Up to 48 hours

## 💡 No Code Changes Required!
This is purely a DNS/infrastructure change. No app code modifications needed.
