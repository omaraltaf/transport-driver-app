# 🚚 Transport Driver App

A beautiful, modern time tracking and performance management app for transport company drivers.

## ✨ Features

### 👨‍✈️ Driver Features
- ⏱️ Time tracking (start work, take breaks, end day)
- 📋 End-of-day reporting (route number, deliveries, pickups)
- 📊 Performance dashboard with interactive charts
- 📱 Mobile-friendly responsive design

### 👑 Admin Features
- 👥 User management (create, delete, modify roles)
- 📈 View all driver performance with graphs
- 🎯 Manage drivers and admins
- 📊 Analytics and insights

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment Variables
Create a `.env` file in the root directory:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Run Development Server
```bash
npm run dev
```

### 4. Build for Production
```bash
npm run build
```

## 🌐 Deploy Online (FREE)

Follow the complete guide in **[DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md)**

**Quick Summary:**
1. Create Supabase account (free database)
2. Run the SQL setup from `supabase-setup.sql`
3. Add environment variables
4. Deploy to Vercel (free hosting)

**Total time: ~15 minutes**

## 🔐 Default Login

**Admin Account:**
- Username: `admin`
- Password: `test2025`

## 🛠️ Tech Stack

- **Frontend**: React 18 + Vite
- **Routing**: React Router 6
- **Charts**: Recharts
- **Database**: Supabase (PostgreSQL)
- **Hosting**: Vercel
- **Styling**: Custom CSS with gradients

## 📁 Project Structure

```
transport-driver-app/
├── src/
│   ├── components/         # React components
│   ├── context/           # Auth context
│   ├── lib/               # Supabase client
│   ├── App.jsx            # Main app component
│   └── main.jsx           # Entry point
├── supabase-setup.sql     # Database schema
├── DEPLOYMENT-GUIDE.md    # Detailed deployment guide
└── package.json
```

## 🎨 Features Showcase

- ✅ Beautiful gradient UI
- ✅ Interactive charts and graphs
- ✅ Real-time data updates
- ✅ Mobile responsive
- ✅ Persistent database
- ✅ Role-based access control
- ✅ Performance analytics

## 📝 License

MIT

## 🤝 Support

Need help? Check the [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md) for detailed instructions.
