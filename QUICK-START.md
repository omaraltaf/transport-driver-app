# ⚡ Quick Start - Deploy in 15 Minutes

## What You'll Get (100% FREE)

✅ **Live website** accessible from anywhere  
✅ **Real database** (not browser storage)  
✅ **500MB database** storage  
✅ **Unlimited users**  
✅ **Mobile-friendly**  
✅ **Automatic HTTPS**  
✅ **Custom domain** (optional)

---

## Step 1: Supabase Setup (5 min)

### Create Account
1. Go to **[supabase.com](https://supabase.com)**
2. Click "Start your project" → Sign up with GitHub

### Create Project
1. Click "New Project"
2. Name: `transport-driver-app`
3. Password: (create strong password)
4. Region: Choose closest to you
5. Click "Create" (wait 2 minutes)

### Setup Database
1. Click "SQL Editor" (left sidebar)
2. Click "New query"
3. Open `supabase-setup.sql` file from your project
4. Copy ALL the SQL code
5. Paste into SQL editor
6. Click "Run" ▶️
7. Should see "Success. No rows returned"

### Get API Keys
1. Click "Settings" (gear icon) → "API"
2. Copy these TWO values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: Long string starting with `eyJ...`

---

## Step 2: Configure App (2 min)

### Create .env File
In your project folder, create a file named `.env`:

```
VITE_SUPABASE_URL=paste_your_project_url_here
VITE_SUPABASE_ANON_KEY=paste_your_anon_key_here
```

### Install & Test
```bash
npm install
npm run dev
```

Open http://localhost:5173 and test login:
- Username: `admin`
- Password: `test2025`

---

## Step 3: Deploy to Vercel (8 min)

### Push to GitHub
```bash
# Initialize git
git init
git add .
git commit -m "Initial commit"

# Create repo on github.com, then:
git remote add origin https://github.com/YOUR-USERNAME/transport-driver-app.git
git branch -M main
git push -u origin main
```

### Deploy on Vercel
1. Go to **[vercel.com](https://vercel.com)**
2. Sign in with GitHub
3. Click "Add New..." → "Project"
4. Select your `transport-driver-app` repo
5. Click "Deploy" (wait 2 minutes)

### Add Environment Variables
1. In Vercel dashboard, click "Settings"
2. Click "Environment Variables"
3. Add BOTH variables:
   - `VITE_SUPABASE_URL` = your URL
   - `VITE_SUPABASE_ANON_KEY` = your key
4. Go to "Deployments" → Click "..." → "Redeploy"

---

## 🎉 Done!

Your app is live at: `https://your-app-name.vercel.app`

**Test it:**
- Login as admin
- Create a driver
- Track time
- View graphs
- Test on phone

---

## 🔄 Making Changes

```bash
git add .
git commit -m "Your changes"
git push
```

Vercel auto-deploys! 🚀

---

## ❓ Troubleshooting

**"Missing Supabase environment variables"**
→ Add them in Vercel Settings → Redeploy

**"Failed to fetch"**
→ Check Supabase URL and key are correct

**Data not saving**
→ Verify SQL setup ran successfully in Supabase

---

## 📱 Share Your App

Send this link to your drivers:
`https://your-app-name.vercel.app`

They can access from any device!

---

Need detailed help? See **[DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md)**
