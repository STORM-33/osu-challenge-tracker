# 🎮 osu! Challenge Tracker

A modern web application for tracking osu! multiplayer challenges with automatic updates and personal score history.

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![Supabase](https://img.shields.io/badge/Supabase-Database-green)
![Vercel](https://img.shields.io/badge/Vercel-Hosting-black)
![License](https://img.shields.io/badge/License-MIT-blue)

## ✨ Features

- 🏆 **Live Challenge Tracking** - Automatically updates when you visit
- 📊 **Detailed Leaderboards** - See top 50 scores for each beatmap
- 🔐 **osu! Login** - Track your personal scores across challenges
- 📈 **Performance Stats** - View your average accuracy and best ranks
- 🎨 **Modern UI** - Dark theme with smooth animations
- 💰 **100% Free** - Runs entirely on free hosting tiers

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Git
- Accounts on: Vercel, Supabase, osu!

### 1. Clone & Setup
```bash
git clone https://github.com/yourusername/osu-challenge-tracker.git
cd osu-challenge-tracker/frontend
npm install
```

### 2. Configure Environment
```bash
cp .env.local.example .env.local
# Edit .env.local with your credentials
```

### 3. Run Development Server
```bash
npm run dev
# Visit http://localhost:3000
```

### 4. Deploy to Production
```bash
vercel
# Follow prompts and add environment variables
```

## 🏗️ How It Works

Unlike traditional trackers that run 24/7, this app updates **on-demand**:

1. **User visits a page** → App checks if data is fresh
2. **If data is >2 minutes old** → Fetches latest from osu! API
3. **Updates database** → Serves fresh data to user
4. **Smart caching** → Prevents API rate limit issues

This approach means:
- ✅ No backend servers needed
- ✅ No scheduled jobs or cron
- ✅ Updates only when someone's looking
- ✅ Runs 100% free forever

## 📋 Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Hosting**: Vercel
- **Auth**: osu! OAuth 2.0
- **APIs**: osu! API v2

## 🔧 Configuration

### Environment Variables
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# osu! OAuth
OSU_CLIENT_ID=your-client-id
OSU_CLIENT_SECRET=your-client-secret
OSU_REDIRECT_URI=your-callback-url

# App
NEXT_PUBLIC_APP_URL=your-app-url
```

### Update Frequency
By default, data is considered stale after 2 minutes. To change:
```javascript
// In API routes
const STALE_TIME = 2 * 60 * 1000; // milliseconds
```

## 📁 Project Structure
```
frontend/
├── components/     # React components
├── hooks/         # Custom React hooks
├── lib/           # Utilities and clients
├── pages/         # Next.js pages and API routes
│   ├── api/       # Backend API endpoints
│   └── ...        # Frontend pages
└── styles/        # CSS files
```

## 🚀 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

**TL;DR:**
1. Create Supabase project and run schema
2. Set up osu! OAuth application
3. Deploy to Vercel with environment variables
4. Visit your site - it just works!

## 📊 API Endpoints

- `GET /api/challenges` - List all challenges
- `GET /api/challenges/[roomId]` - Get challenge details
- `POST /api/update-challenge` - Force update a challenge
- `GET /api/user/scores` - Get user's scores (auth required)
- `GET /api/health` - System health check

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📝 License

MIT License - see [LICENSE](./LICENSE) for details

## 🙏 Acknowledgments

- [osu!](https://osu.ppy.sh) for the amazing game and API
- [Vercel](https://vercel.com) for free hosting
- [Supabase](https://supabase.com) for free database
- The osu! community for inspiration

## 🐛 Troubleshooting

### Data not updating?
- Check Vercel function logs
- Verify API credentials
- Ensure room is public on osu!

### Can't login?
- Check OAuth redirect URLs match exactly
- Ensure cookies are enabled
- Verify environment variables

### Need help?
- Check [Issues](https://github.com/yourusername/osu-challenge-tracker/issues)
- Join our [Discord](#)
- Read the [docs](./docs)

---

Made with ❤️ for the osu! community