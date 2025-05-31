#!/bin/bash

echo "🎮 osu! Challenge Tracker Setup Script"
echo "======================================"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if running from project root
if [ ! -f "README.md" ]; then
    echo -e "${RED}Please run this script from the project root directory${NC}"
    exit 1
fi

# Create project structure
echo -e "${YELLOW}Creating project structure...${NC}"
mkdir -p frontend/{components,lib,pages/{api/{auth,challenges,user},challenges},styles}
mkdir -p backend-worker/src

# Initialize frontend
echo -e "${YELLOW}Setting up frontend...${NC}"
cd frontend

# Create package.json
cat > package.json << 'EOF'
{
  "name": "osu-challenge-tracker",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.0.4",
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "@supabase/supabase-js": "^2.39.0",
    "swr": "^2.2.4",
    "lucide-react": "^0.303.0"
  },
  "devDependencies": {
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.4.0",
    "eslint": "^8.56.0",
    "eslint-config-next": "14.0.4"
  }
}
EOF

# Create next.config.js
cat > next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['a.ppy.sh', 'assets.ppy.sh'],
  },
}

module.exports = nextConfig
EOF

# Create tailwind.config.js
cat > tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        purple: {
          400: '#a855f7',
          500: '#9333ea',
          600: '#7c3aed',
          700: '#6d28d9',
          900: '#4c1d95',
        },
        pink: {
          400: '#f472b6',
          500: '#ec4899',
          900: '#831843',
        },
      },
    },
  },
  plugins: [],
}
EOF

# Create postcss.config.js
cat > postcss.config.js << 'EOF'
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOF

# Create global styles
cat > styles/globals.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-gray-900 text-white;
  }
}

@layer utilities {
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}
EOF

# Create .env.local template
cat > .env.local.example << 'EOF'
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# osu! OAuth
OSU_CLIENT_ID=your-osu-client-id
OSU_CLIENT_SECRET=your-osu-client-secret
OSU_REDIRECT_URI=http://localhost:3000/api/auth/callback

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF

echo -e "${GREEN}Frontend structure created!${NC}"

# Setup backend
cd ../backend-worker

# Create .env template
cat > .env.example << 'EOF'
# Supabase
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_KEY=your-supabase-service-key

# osu! API
OSU_CLIENT_ID=your-osu-client-id
OSU_CLIENT_SECRET=your-osu-client-secret

# Tracked rooms (comma-separated)
TRACKED_ROOMS=1392361
EOF

echo -e "${GREEN}Backend structure created!${NC}"

# Create main README
cd ..
cat > README.md << 'EOF'
# osu! Challenge Tracker

Track your progress across osu! community challenges with real-time updates!

## Features
- 🎮 Real-time challenge tracking
- 📊 Detailed leaderboards
- 👤 Personal score history
- 🔄 Automatic updates every minute
- 🎨 Modern, responsive UI

## Tech Stack
- **Frontend**: Next.js, React, Tailwind CSS (Vercel)
- **Backend**: Python worker (Railway)
- **Database**: Supabase (PostgreSQL)
- **Auth**: osu! OAuth

## Quick Start

1. **Setup Environment**
   - Copy `.env.local.example` to `.env.local` in frontend
   - Copy `.env.example` to `.env` in backend-worker
   - Fill in your credentials

2. **Install Dependencies**
   ```bash
   cd frontend && npm install
   cd ../backend-worker && pip install -r requirements.txt
   ```

3. **Run Development**
   ```bash
   # Terminal 1 - Frontend
   cd frontend && npm run dev

   # Terminal 2 - Backend
   cd backend-worker && python src/worker.py
   ```

## Deployment
See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## License
MIT
EOF

echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Copy the provided code files to their respective locations"
echo "2. Set up your environment variables"
echo "3. Create accounts on Supabase, Vercel, and Railway"
echo "4. Follow the deployment guide"
echo ""
echo -e "${YELLOW}Don't forget to:${NC}"
echo "- Create an osu! OAuth application"
echo "- Set up your Supabase database with the provided schema"
echo "- Configure all environment variables"