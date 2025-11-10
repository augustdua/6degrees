# 🤖 Telegram Integration Setup Guide for 6Degree

This guide will help you set up the Telegram bot integration for real-time notifications.

## 📋 Prerequisites

- A Telegram account
- Admin access to 6Degree backend
- Access to Railway/deployment environment variables

---

## 🚀 Step 1: Create a Telegram Bot

1. Open Telegram and search for **@BotFather**
2. Start a conversation and send: `/newbot`
3. Follow the prompts:
   - Choose a name: `6Degree Connector` (or your preferred name)
   - Choose a username: `sixdegree_bot` (must end with `bot`)
4. **Save the bot token** (looks like: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### Optional: Customize your bot

```
/setdescription - Set a description for your bot
/setabouttext - Set the About text
/setuserpic - Set a profile picture
```

Example description:
```
Get instant notifications for messages, connections, offers, and bids on 6Degree. 
Link your account with /link to start receiving updates!
```

---

## 🔧 Step 2: Configure Environment Variables

### Backend (.env or Railway)

Add these environment variables to your backend:

```bash
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
APP_URL=https://6degree.app
NODE_ENV=production
```

### Frontend (.env or Railway)

No additional frontend variables needed for basic integration.

---

## 🗄️ Step 3: Run Database Migration

Run the Telegram support migration in your Supabase SQL editor:

```bash
# The migration file is at:
supabase/migrations/076_add_telegram_support.sql
```

Or via Supabase Dashboard:
1. Go to SQL Editor
2. Copy contents of `076_add_telegram_support.sql`
3. Run the migration

This will:
- ✅ Add Telegram fields to users table
- ✅ Create `telegram_link_tokens` table
- ✅ Create `telegram_notification_queue` table
- ✅ Set up database triggers for auto-notifications
- ✅ Create helper functions

---

## 🚢 Step 4: Deploy Backend Changes

### Install NPM Package

The package is already added to `package.json`:
```json
"node-telegram-bot-api": "^latest"
```

### Deploy to Railway

```bash
# From backend directory
git add .
git commit -m "feat: Add Telegram bot integration"
git push origin main
```

Railway will automatically:
1. Install the new package
2. Initialize the bot on startup
3. Start the notification queue processor

### Verify Deployment

Check Railway logs for:
```
✅ Telegram bot initialized successfully
📡 Database listener setup
```

---

## 👥 Step 5: User Setup (How Users Connect)

### Option A: Direct Link Command (Recommended)

1. User opens Telegram
2. Searches for your bot: `@sixdegree_bot`
3. Sends: `/start`
4. Sends: `/link user@email.com`
5. Clicks the link to complete connection
6. Notifications are now enabled!

### Option B: Settings Page

1. User goes to Settings → Notifications
2. Clicks "Open Telegram Bot"
3. Follows linking instructions
4. Enters token from Telegram
5. Done!

---

## 📬 Notification Types

Once linked, users will receive Telegram notifications for:

### 💬 Messages
- New direct messages from connections
- Quick reply options in Telegram

### 🤝 Connections
- New connection requests
- Connection approvals
- Connection rejections

### 💰 Offers & Bids
- New bids on their offers
- Bid acceptances
- Bid rejections

### 🔗 Networking Requests
- New referrers joining their requests
- Request completions with rewards
- Bids on their requests

### 📞 Intro Calls
- Call scheduled notifications
- Reminder before calls

---

## 🧪 Testing

### Test the Bot

1. Link your account using `/link your.email@example.com`
2. From Settings → Telegram → Click "Send Test Notification"
3. Check Telegram for the test message

### Test Notifications

Send yourself a message or create a test connection request.

### Debug Logs

Check Railway logs:
```bash
railway logs --tail
```

Look for:
- `✅ Telegram bot initialized`
- `Telegram notification queue processor started`
- Notification processing logs

---

## 🔒 Security & Privacy

### Data Stored
- `telegram_chat_id` - For sending notifications
- `telegram_username` - Display purposes only
- `telegram_notifications_enabled` - User preference

### User Control
- ✅ Users can unlink anytime with `/unlink`
- ✅ Users can toggle notifications on/off
- ✅ All data deleted when unlinking

### Bot Commands for Users

```
/start - Welcome message and setup instructions
/link [email] - Link 6Degree account
/unlink - Remove link and stop notifications
/status - Check connection status
/notify on/off - Toggle notifications
/help - Show all commands
```

---

## 🛠️ Troubleshooting

### Bot not responding
- Check `TELEGRAM_BOT_TOKEN` is set correctly
- Verify bot is running: Check Railway logs
- Restart the backend service

### Notifications not arriving
- Check user has linked account: `/status`
- Check notifications are enabled: `/notify on`
- Check database queue: `SELECT * FROM telegram_notification_queue WHERE status = 'pending'`

### Linking fails
- Check token expiry (15 minutes)
- Verify email matches account
- Check database for link tokens: `SELECT * FROM telegram_link_tokens WHERE used = false`

### Clear old data
```sql
-- Clean up expired tokens
SELECT cleanup_expired_telegram_tokens();

-- Clean up old notification context (24h+)
SELECT cleanup_old_telegram_context();
```

---

## 📊 Monitoring

### Check Notification Queue

```sql
-- See pending notifications
SELECT 
  notification_type, 
  COUNT(*) as count,
  MAX(created_at) as latest
FROM telegram_notification_queue
WHERE status = 'pending'
GROUP BY notification_type;

-- See failed notifications
SELECT * 
FROM telegram_notification_queue 
WHERE status = 'failed' 
ORDER BY created_at DESC 
LIMIT 10;
```

### Check Connected Users

```sql
SELECT 
  COUNT(*) as total_linked,
  COUNT(*) FILTER (WHERE telegram_notifications_enabled = true) as notifications_enabled
FROM users
WHERE telegram_chat_id IS NOT NULL;
```

---

## 🎨 Customization

### Change Bot Name/Description

Message @BotFather:
```
/mybots
[Select your bot]
/setname - Change bot display name
/setdescription - Change description
```

### Customize Messages

Edit `backend/src/services/telegramService.ts`:
- Command responses
- Notification templates
- Button labels

---

## 🚀 Next Steps

### Enhancements You Can Add

1. **Two-way messaging** - Reply to messages directly from Telegram
2. **Inline keyboards** - More interactive buttons
3. **Group notifications** - Notify teams/groups
4. **Rich media** - Send images, files
5. **Analytics** - Track notification open rates

---

## 📚 Resources

- [Telegram Bot API Docs](https://core.telegram.org/bots/api)
- [node-telegram-bot-api](https://github.com/yagop/node-telegram-bot-api)
- [BotFather Commands](https://core.telegram.org/bots#6-botfather)

---

## ✅ Checklist

- [ ] Created Telegram bot via @BotFather
- [ ] Added `TELEGRAM_BOT_TOKEN` to Railway
- [ ] Ran database migration `076_add_telegram_support.sql`
- [ ] Deployed backend changes
- [ ] Tested bot with `/start` command
- [ ] Linked test account with `/link`
- [ ] Sent test notification
- [ ] Verified notification arrives in Telegram
- [ ] Updated bot description/profile
- [ ] Documented bot username for users

---

Need help? Check the troubleshooting section or contact the dev team!






