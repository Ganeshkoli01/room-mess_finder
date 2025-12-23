# Room & Mess Finder 🏠🍽️

A modern web application to find affordable rooms, PGs, hostels, and mess/tiffin services across India. Built with React, TypeScript, and Supabase.

![Room & Mess Finder](./public/og-image.png)

## ✨ Features

### For Users
- 🔍 **Smart Search** - Find rooms and mess near your location
- 📍 **Location-Based** - Auto-detects your location using GPS
- 🗺️ **Interactive Maps** - View listings on OpenStreetMap
- 🤖 **AI Chatbot** - Get instant answers powered by Google Gemini
- ⭐ **Reviews & Ratings** - Read reviews from other users
- 📱 **Mobile Responsive** - Works perfectly on all devices

### For Owners
- 📝 **List Properties** - Add your rooms or mess services
- 📊 **Dashboard** - Manage your listings
- 📩 **Enquiries** - Receive and respond to user enquiries

### For Admins
- 👥 **User Management** - Manage users and roles
- ✅ **Verification** - Verify listings
- 📈 **Analytics** - View platform statistics

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm 9+
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/room-and-mess-finder.git
   cd room-and-mess-finder
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` with your API keys.

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:8080
   ```

## 📦 Build for Production

```bash
# Type check and build
npm run build

# Preview production build
npm run preview
```

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **Frontend** | React 18, TypeScript |
| **Styling** | Tailwind CSS, shadcn/ui |
| **State Management** | React Query, Context API |
| **Routing** | React Router v6 |
| **Maps** | OpenStreetMap, Leaflet, Nominatim |
| **Database** | Supabase (PostgreSQL) |
| **Authentication** | Supabase Auth |
| **AI** | Google Gemini API |
| **Build Tool** | Vite |

## 📁 Project Structure

```
src/
├── components/     # Reusable UI components
│   ├── ui/        # shadcn/ui components
│   ├── layout/    # Layout components
│   ├── cards/     # Card components
│   └── chat/      # AI Chatbot
├── contexts/      # React Context providers
├── hooks/         # Custom React hooks
├── lib/           # Utilities and helpers
├── pages/         # Route pages
├── services/      # API services
└── integrations/  # Third-party integrations
```

## 🔐 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Supabase project URL | ✅ |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key | ✅ |
| `VITE_GEMINI_API_KEY` | Google Gemini API key | ❌ |

## 📜 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Lint and fix code |
| `npm run type-check` | TypeScript type checking |
| `npm run clean` | Clean build artifacts |

## 🗺️ OpenStreetMap Integration

This app uses 100% free and open-source mapping services:

- **Map Tiles**: OpenStreetMap
- **Map Library**: Leaflet + React-Leaflet
- **Geocoding**: Nominatim
- **Places Search**: Overpass API

No Google Maps API key required!

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting a PR.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) for beautiful UI components
- [OpenStreetMap](https://www.openstreetmap.org/) for free map data
- [Supabase](https://supabase.com/) for backend services
- [Lucide](https://lucide.dev/) for icons

---

Made with ❤️ in India
