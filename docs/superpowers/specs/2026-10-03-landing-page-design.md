# WattSnap AI Landing Page Design Specification

## Overview
WattSnap AI is a household electricity assistant helping families understand power bills, estimate appliance consumption, receive energy-saving tips, and prepare for brownouts/power interruptions.

This specification defines the architecture, components, visual design, and asset pipeline for the public landing page served at `/` (`src/app/page.tsx`), while keeping the household application dashboard isolated at `/dashboard` (`src/app/(household)/dashboard/page.tsx`).

## Design & Visual Aesthetics
The visual identity follows the mockups precisely:
- **Palette**: Electric cyan (`#0284c7` to `#38bdf8`), energetic lightning amber (`#f59e0b` to `#fbbf24`), vibrant emerald green (`#10b981`), crisp white glassmorphism cards, and soft ambient gradient backgrounds (sky blue to warm pastel yellow/green).
- **Typography**: Clean, modern sans-serif typography (`Inter`, system-ui), high legibility, crisp weight contrast.
- **Micro-animations**: Subtle floating animations on the mascot and callout badges, hover elevation transitions on cards and action buttons.
- **Zero Blurry Images**: High-resolution branding assets (`wattsnap-logo.png`, `Cheerful Bee Robot Thumbs-Up.png`) served from `public/assets/branding/`. The phone mockup is built with interactive CSS/SVG elements so every label, number, and icon is ultra-sharp on retina and high-DPI displays.

## Information Architecture & Page Sections

```text
[ Navbar ]
  - Brand Logo + Mascot
  - Nav Links: Home (#), Features (#features), How It Works (#how-it-works), About (#about)
  - Actions: "Household Dashboard" (/dashboard) + "Download App" (#download)

[ Hero Section ]
  - Tag Badge: "Smart Energy. Brighter Homes."
  - Headline: "Your Home Electricity Assistant" (dual-gradient text)
  - Subhead: "Understand your bills. Save energy. Be ready for brownouts."
  - CTA Buttons: "Download for Free" (primary) + "Watch Video" (secondary outline)
  - Mascot Graphic: WattSnap mascot winking with thumbs-up and light aura
  - Interactive Mobile Preview: 3D-styled smartphone showing live app dashboard with:
      - Status bar (9:41, wifi, battery)
      - Welcome greeting ("Good morning, Maria!")
      - Monthly Bill Card (₱ 2,480.00, -8% vs last month)
      - Quick actions (Scan Bill, My Appliances, Energy Tips, Provider Advisories, Location, Bill History)
      - Bottom navigation bar
  - 4 Floating Feature Pill Badges:
      1. Understand Your Bills (Easy and clear explanations)
      2. Monitor Usage (Track your electricity in real time)
      3. Save Energy Save Money (Get practical tips for a more efficient home)
      4. Helpful AI Guidance (Ask questions and get instant answers)

[ Features Section ] (#features)
  - Section Header: "Smart Features for a Brighter Home"
  - Subhead: "Everything you need to manage your electricity usage — all in one app."
  - Left: Interactive Phone Showcase with highlighted feature cards
  - Right: 4 Interactive Feature Cards:
      1. Scan Your Electricity Bill (AI extraction)
      2. Track Your Consumption (Daily/weekly/monthly charts)
      3. Get Energy-Saving Tips (Personalized recommendations)
      4. Stay Updated (Real-time power advisories & interruptions)

[ How It Works Section ] (#how-it-works)
  - Section Header: "How WattSnap Works"
  - 4-Step Process:
      Step 1: Scan Your Bill (Take photo of electricity bill)
      Step 2: AI Analysis (AI reads and analyzes details)
      Step 3: View Insights (Consumption trends and breakdown)
      Step 4: Take Action (Tips and outage readiness)

[ Spotlight Showcase Cards ]
  - Card 1: "Be Ready for What's Next ⚡" (Real-time ANTECO / Panay outage updates, mascot with megaphone)
  - Card 2: "Smarter Homes Brighter Tomorrows 🍃" (Energy efficiency & green sustainable future)

[ Testimonials Section ] (#about)
  - Header: "What Users Are Saying"
  - 3 Testimonial Cards:
      - Maria S. (5 stars): "WattSnap helped me understand my bill. Now I know where my money goes!"
      - John R. (5 stars): "The energy tips are super helpful. Our bill is lower compared last month!"
      - Anna L. (5 stars): "I love the clean and simple design. It's very easy to use!"

[ Download CTA Banner ] (#download)
  - Cyan-blue gradient container with clouds & mascot holding smartphone
  - Headline: "Download WattSnap Now"
  - Subhead: "Manage your electricity, save money, and build a brighter home today."
  - Badges: Google Play & Apple App Store download buttons

[ Footer ]
  - Brand identity, copyright, privacy & terms links, and disclaimer noting support for Philippine distribution utilities (ANTECO / Panay).
```

## Directory & File Layout
```text
WATTSNAP/
  public/
    assets/
      branding/
        wattsnap-logo.png
        Cheerful Bee Robot Thumbs-Up.png
  src/
    app/
      globals.css                     # Design tokens, variables, typography, animations
      layout.tsx                      # Root layout, metadata, font configuration
      page.tsx                        # Public landing page orchestrator
      (household)/
        dashboard/
          page.tsx                    # Household dashboard (isolated from landing page)
    features/
      landing/
        components/
          Navbar.tsx                  # Header navigation & quick links
          HeroSection.tsx             # Hero banner with mascot & CTAs
          PhoneMockup.tsx             # Interactive CSS/SVG mobile app preview
          FeaturesSection.tsx         # Smart features breakdown
          HowItWorksSection.tsx       # 4-step workflow
          SpotlightSection.tsx        # Outage alerts & green mission cards
          TestimonialsSection.tsx     # Customer social proof
          DownloadCtaBanner.tsx       # App store download banner
          Footer.tsx                  # Footer & utility links
```

## Runtime Dependencies
- `next`: `^15.2.0` (or latest Next.js 15)
- `react`: `^19.0.0`
- `react-dom`: `^19.0.0`
- `lucide-react`: `^1.16.0` (for clean, crisp icons matching the mockups)
- `typescript`: `^5.0.0`
- `@types/node`, `@types/react`, `@types/react-dom`
