# 🚀 Deployment Guide - Transport Driver App

This guide will help you deploy your app online for **FREE** using Supabase (database) and Vercel (hosting).

---

## Step 1: Setup Supabase Database (5 minutes)

### 1.1 Create Supabase Account
1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign up with GitHub (recommended) or email

### 1.2 Create New Project
1. Click "New Project"
2. Fill in:
   - **Name**: `transport-driver-app`
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to you
3. Click "Create new project" (takes ~2 minutes)

### 1.3 Setup Database Tables
1. In your Supabase dashboard, click "SQL Editor" (left sidebar)
2. Click "New query"
3. Copy the entire content from `supabase-setup.sql` file
4. Paste it into the SQL editor
5. Click "Run" (bottom right)
6. You should see "Success. No rows returned"

### 1.4 Get Your API Keys
1. Click "Settings" (gear icon, left sidebar)
2. Click "API" in the settings menu
3. Copy these two values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)

---

## Step 2: Configure Your App (2 minutes)

### 2.1 Create Environment File
1. In your project folder, create a file named `.env`
2. Add these lines (replace with your actual values):

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 2.2 Install Dependencies
```bash
npm install
```

### 2.3 Test Locally
```bash
npm run dev
```

Open http://localhost:5173 and test:
- Login with: username `admin`, password `test2025`
- Create a test driver
- Track some time
- Check if data persists after refresh

---

## Step 3: Deploy to Vercel (5 minutes)

### 3.1 Prepare for Deployment
```bash
# Initialize git (if not already done)
git init
git add .
git commit -m "Initial commit with Supabase"
```

### 3.2 Push to GitHub
1. Go to [github.com](https://github.com)
2. Click "+" → "New repository"
3. Name it: `transport-driver-app`
4. Don't initialize with README
5. Copy the commands shown and run them:

```bash
git remote add origin https://github.com/YOUR-USERNAME/transport-driver-app.git
git branch -M main
git push -u origin main
```

### 3.3 Deploy on Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "Sign Up" → Sign in with GitHub
3. Click "Add New..." → "Project"
4. Import your `transport-driver-app` repository
5. Click "Deploy"

### 3.4 Add Environment Variables to Vercel
1. After deployment, go to your project dashboard
2. Click "Settings" → "Environment Variables"
3. Add both variables:
   - Name: `VITE_SUPABASE_URL`, Value: `your-supabase-url`
   - Name: `VITE_SUPABASE_ANON_KEY`, Value: `your-anon-key`
4. Click "Save"
5. Go to "Deployments" tab
6. Click "..." on latest deployment → "Redeploy"

---

## Step 4: Test Your Live App! 🎉

Your app is now live at: `https://your-app-name.vercel.app`

**Test everything:**
- ✅ Login as admin (username: `admin`, password: `test2025`)
- ✅ Create a new driver
- ✅ Login as driver
- ✅ Track time
- ✅ View performance graphs
- ✅ Test on mobile device

---

## 🎯 What You Get (All FREE):

### Supabase Free Tier:
- ✅ 500MB database storage
- ✅ 2GB bandwidth per month
- ✅ 50,000 monthly active users
- ✅ Unlimited API requests
- ✅ Real-time subscriptions

### Vercel Free Tier:
- ✅ Unlimited deployments
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ 100GB bandwidth per month
- ✅ Auto-deploy on git push

---

## 🔧 Troubleshooting

### "Missing Supabase environment variables"
- Make sure you added the environment variables in Vercel
- Redeploy after adding them

### "Failed to fetch" errors
- Check your Supabase URL is correct
- Verify your anon key is correct
- Check Supabase project is not paused

### Data not saving
- Check SQL setup ran successfully
- Verify RLS policies are enabled
- Check browser console for errors

---

## 📱 Share Your App

Your app URL: `https://your-app-name.vercel.app`

You can:
- Share this URL with your drivers
- Add a custom domain in Vercel settings
- Access from any device with internet

---

## 🔄 Making Updates

Whenever you make changes:

```bash
git add .
git commit -m "Description of changes"
git push
```

Vercel will automatically redeploy! 🚀

---

## 💡 Next Steps

- Add custom domain (Vercel Settings → Domains)
- Enable email notifications
- Add password reset functionality
- Export reports to PDF
- Add more analytics

---

Need help? Check:
- Supabase Docs: https://supabase.com/docs
- Vercel Docs: https://vercel.com/docs
