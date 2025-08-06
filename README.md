# SkyGuard Frontend

A professional weather intelligence dashboard built with Next.js, providing enterprise-grade weather forecasting and risk assessment capabilities.

![SkyGuard Dashboard](https://img.shields.io/badge/Next.js-15.3.3-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4.17-38B2AC?style=flat-square&logo=tailwind-css)

## 🌦️ About SkyGuard

SkyGuard is a comprehensive weather intelligence platform designed for enterprise clients who need accurate, actionable weather insights for business decision-making. The frontend provides an intuitive dashboard for weather monitoring, risk assessment, and scenario simulation.

## ✨ Features

- **Real-time Weather Monitoring**: Live weather data visualization with interactive maps
- **Risk Assessment Dashboard**: Comprehensive analysis of weather-related business risks
- **Scenario Simulation**: Advanced modeling for weather impact planning
- **Professional UI/UX**: Clean, enterprise-grade interface optimized for business use
- **Responsive Design**: Works seamlessly across desktop, tablet, and mobile devices
- **Interactive Charts**: Powered by Recharts for clear data visualization

## 🛠️ Tech Stack

- **Framework**: Next.js 15.3.3 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI primitives
- **Charts**: Recharts
- **Maps**: D3.js with TopoJSON
- **Forms**: React Hook Form with Zod validation
- **HTTP Client**: Axios
- **Animations**: Framer Motion

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, pnpm, or bun

### Installation

1. Clone the repository:
```bash
git clone https://github.com/SammarieoBrown/skyguard-frontend.git
cd skyguard-frontend
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your API keys and configuration
```

4. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
skyguard-frontend/
├── src/
│   ├── app/                 # App Router pages
│   │   ├── dashboard/       # Dashboard page
│   │   └── layout.tsx       # Root layout
│   ├── components/          # Reusable components
│   │   ├── dashboard/       # Dashboard-specific components
│   │   └── ui/             # Base UI components
│   ├── lib/                # Utilities and API functions
│   └── types/              # TypeScript type definitions
├── public/                 # Static assets
└── docs/                   # Documentation
```

## 🎨 Design Philosophy

SkyGuard follows professional enterprise UI/UX principles:

- **Clean & Minimal**: No flashy effects, focus on functionality
- **Consistent Typography**: Clear hierarchy with Inter font
- **Subtle Color Palette**: Professional grays and minimal accent colors
- **Responsive Layout**: Sidebar navigation with clean grid system
- **Accessibility**: WCAG compliant design patterns

## 🔧 Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## 📊 Dashboard Features

- **Overview**: Key weather metrics and alerts
- **Risk Assessment**: Weather impact analysis for business operations
- **Scenario Simulation**: Modeling tools for planning and preparation
- **Impact Analysis**: Historical and predictive weather impact reports

## 🌐 API Integration

The frontend integrates with weather APIs for real-time data. See the [API Documentation](./Nowcasting_API_Frontend_Guide.md) for detailed integration guides.

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to [Vercel](https://vercel.com)
3. Configure environment variables
4. Deploy automatically on every push

### Manual Deployment

```bash
npm run build
npm run start
```

## 📄 License

This project is private and proprietary. All rights reserved.

## 👨‍💻 Author

**Sammarieo Brown**
- GitHub: [@SammarieoBrown](https://github.com/SammarieoBrown)
- LinkedIn: [Sammarieo Brown](https://www.linkedin.com/in/sammarieo-brown-50856a1b8/)
- Email: sammarieobrown21@gmail.com

## 🤝 Contributing

This is a private project. For collaboration inquiries, please contact the author directly.

---

Built with ❤️ for enterprise weather intelligence
