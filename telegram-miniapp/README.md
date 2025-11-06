# 6Degree Telegram Mini App

Lightweight Telegram Mini App for 6Degree messaging.

## Features
- ✅ Telegram WebApp authentication
- ✅ Reuses main app's MessagesTab UI via iframe
- ✅ Fast loading (~100KB bundle)
- ✅ No SPA routing issues
- ✅ Independent deployment

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deploy to Railway

1. Create new Railway service
2. Connect to this repo
3. Set root directory: `telegram-miniapp`
4. Add environment variable: `VITE_API_URL=https://your-api.railway.app`
5. Deploy!

## Configure in @BotFather

Set Mini App URL to: `https://your-miniapp.railway.app`

