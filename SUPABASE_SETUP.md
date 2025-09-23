# Supabase Setup Guide for 6Degrees

This guide will help you set up Supabase for your 6Degrees networking platform.

## 🚀 Quick Start

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in to your account
3. Click "New Project"
4. Choose your organization
5. Enter project details:
   - **Name**: `6degrees` (or your preferred name)
   - **Database Password**: Generate a strong password
   - **Region**: Choose the closest region to your users
6. Click "Create new project"

### 2. Get Your Project Credentials

Once your project is created:

1. Go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://your-project.supabase.co`)
   - **Anon public key** (starts with `eyJ...`)
   - **Service role key** (starts with `eyJ...`) - Keep this secret!

### 3. Set Up Environment Variables

#### Frontend (.env)
Create a `.env` file in your `frontend` directory:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_APP_URL=http://localhost:5173
```

#### Backend (.env)
Create a `.env` file in your `backend` directory:

```env
PORT=3001
NODE_ENV=development

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

FRONTEND_URL=http://localhost:5173
```

### 4. Run Database Migrations

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Initialize Supabase in your project:
   ```bash
   supabase init
   ```

3. Link your project:
   ```bash
   supabase link --project-ref your-project-ref
   ```

4. Run the migration:
   ```bash
   supabase db push
   ```

   Or manually run the SQL from `supabase/migrations/001_initial_schema.sql` in your Supabase SQL editor.

### 5. Install Dependencies

#### Frontend
```bash
cd frontend
npm install
```

#### Backend
```bash
cd backend
npm install
```

### 6. Start Development Servers

#### Frontend
```bash
cd frontend
npm run dev
```

#### Backend
```bash
cd backend
npm run dev
```

## 📊 Database Schema

The setup includes the following tables:

### Users Table
- Extends Supabase's built-in `auth.users`
- Stores profile information (name, bio, social links)
- Includes verification status

### Connection Requests Table
- Stores user connection requests
- Includes target description, reward amount, expiration
- Generates unique shareable links

### Chains Table
- Tracks connection chains
- Stores participants as JSONB
- Manages chain status and completion

### Rewards Table
- Tracks reward distribution
- Links users to chains
- Manages payment status

## 🔐 Authentication

Supabase handles authentication automatically:

- **Sign Up**: Users can register with email/password
- **Sign In**: Standard email/password authentication
- **Session Management**: Automatic token refresh
- **Row Level Security**: Database-level access control

## 🛡️ Security Features

### Row Level Security (RLS)
- Users can only access their own data
- Public access to active connection requests
- Secure chain participation

### API Security
- Rate limiting on all endpoints
- Input validation with Joi
- CORS configuration
- Helmet security headers

## 🔧 Configuration

### Supabase Dashboard
Access your project dashboard at: `https://supabase.com/dashboard/project/your-project-id`

### Key Settings to Configure:

1. **Authentication**:
   - Go to Authentication → Settings
   - Configure email templates
   - Set up email confirmation (optional)

2. **Database**:
   - Go to Database → Tables
   - Review your tables and relationships
   - Check Row Level Security policies

3. **API**:
   - Go to Settings → API
   - Review your API keys
   - Configure CORS if needed

## 🚀 Deployment

### Frontend Deployment (Vercel/Netlify)

1. Set environment variables in your deployment platform:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

2. Deploy your frontend

### Backend Deployment (Railway/Render)

1. Set environment variables:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

2. Deploy your backend

## 📱 Features Included

### ✅ Implemented
- User authentication (sign up/sign in)
- User profile management
- Connection request creation
- Chain building and participation
- Reward tracking
- Real-time updates (via Supabase subscriptions)

### 🔄 Real-time Features
Supabase provides real-time subscriptions out of the box. You can listen to:
- New connection requests
- Chain updates
- Reward status changes

Example:
```typescript
const subscription = supabase
  .channel('chains')
  .on('postgres_changes', 
    { event: 'UPDATE', schema: 'public', table: 'chains' },
    (payload) => console.log('Chain updated:', payload)
  )
  .subscribe();
```

## 🐛 Troubleshooting

### Common Issues

1. **Authentication not working**:
   - Check your environment variables
   - Verify Supabase project is active
   - Check browser console for errors

2. **Database connection issues**:
   - Verify your database password
   - Check if migrations ran successfully
   - Review RLS policies

3. **CORS errors**:
   - Update CORS settings in Supabase dashboard
   - Check frontend URL configuration

### Getting Help

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com)
- [GitHub Issues](https://github.com/supabase/supabase/issues)

## 🎉 You're Ready!

Your 6Degrees platform is now powered by Supabase! You have:

- ✅ PostgreSQL database with real-time capabilities
- ✅ Built-in authentication system
- ✅ Row-level security
- ✅ Automatic API generation
- ✅ Real-time subscriptions
- ✅ File storage (if needed)

Start building your networking platform! 🚀
