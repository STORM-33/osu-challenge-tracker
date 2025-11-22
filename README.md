# 🎮 osu!Challengers Nexus

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat&logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?style=flat&logo=supabase)
![Stripe](https://img.shields.io/badge/Stripe-Payments-635bff?style=flat&logo=stripe)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38bdf8?style=flat&logo=tailwindcss)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat)

A comprehensive web platform designed to track, manage, and gamify multiplayer challenges within the osu! community. Features live tracking, seasonal leaderboards with weighted scoring, custom ruleset validation.

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 14 (Pages Router), React 18 |
| **Styling** | Tailwind CSS with custom glassmorphism design |
| **Database** | Supabase (PostgreSQL) |
| **Authentication** | Supabase Auth + osu! OAuth 2.0 |
| **Payments** | Stripe API |
| **Deployment** | Docker-ready, Vercel-optimized |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Supabase project
- osu! API Client (OAuth)
- Stripe account (for donation features)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/osu-challenge-tracker.git
   cd osu-challenge-tracker/frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env.local` file in the `frontend` directory (use `.env.local.example` as reference):

   ```bash
   # App Configuration
   NEXT_PUBLIC_APP_URL=http://localhost:3000

   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_KEY=your-service-role-key

   # osu! OAuth
   OSU_CLIENT_ID=your-osu-client-id
   OSU_CLIENT_SECRET=your-osu-client-secret
   OSU_REDIRECT_URI=http://localhost:3000/api/auth/callback

   # Security
   # Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   TOKEN_ENCRYPTION_KEY=base64-encoded-32-byte-key
   SESSION_SECRET=your-session-secret
   SCHEDULER_SHARED_SECRET=long-random-string-for-cron-auth

   # Stripe
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

   Navigate to [http://localhost:3000](http://localhost:3000)

### 🐳 Docker Deployment

Build and run the production container:

```bash
# Build
docker build -t osu-challengers ./frontend

# Run
docker run -p 3000:3000 --env-file .env.local osu-challengers
```

---

## 📁 Project Structure

```
frontend/
├── components/              # React components
│   ├── settings/           # Settings-specific components
│   └── ...                 # UI components, cards, modals
├── lib/                    # Utilities and business logic
│   ├── api-utils.js        # API response handling & validation
│   ├── auth-middleware.js  # Security middleware
│   ├── osu-api.js          # osu! API wrapper
│   ├── seasons.js          # Season logic and rotation
│   ├── stripe.js           # Payment processing
│   └── supabase.js         # Database clients
├── pages/
│   ├── api/                # Backend API routes
│   │   ├── admin/          # Protected admin endpoints
│   │   ├── auth/           # OAuth flow
│   │   ├── challenges/     # Challenge CRUD operations
│   │   ├── cron/           # Scheduled tasks
│   │   └── webhook/        # Stripe webhooks
│   ├── admin.js            # Admin dashboard
│   ├── challenges.js       # Challenge listing
│   ├── leaderboard.js      # Seasonal leaderboard
│   └── ...
└── public/                 # Static assets and fonts
```

---

## 🔄 Data Syncing Strategy

The platform uses a hybrid update strategy to respect osu! API rate limits while maintaining fresh data:

- **On-Demand Caching** — Checks data freshness when users view challenges (default threshold: 5 minutes)
- **Background Cron Jobs** — Scheduled tasks at `/api/cron/update-challenges` refresh active challenges periodically
- **Smart Caching** — In-memory caching via `memory-cache.js` reduces database load

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## ⚠️ Disclaimer

This project is not affiliated with, endorsed, or sponsored by ppy Pty Ltd or osu!.

---

## 📞 Support

For issues, questions, or feature requests, please [open an issue](https://github.com/yourusername/osu-challenge-tracker/issues) on GitHub.
