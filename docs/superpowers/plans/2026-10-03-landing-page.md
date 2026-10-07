# WattSnap AI Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and render the high-fidelity WattSnap AI landing page at `src/app/page.tsx` matching the user's design mockups, with modular components in `src/features/landing/components/`, styling in `src/app/globals.css`, and public assets in `public/assets/`, maintaining separation with `src/app/(household)/dashboard/page.tsx`.

**Architecture:** A Next.js 15 App Router application with React 19 and Vanilla CSS. The public landing page (`/`) is composed of modular components for each section, while the authenticated household dashboard is maintained separately under `(household)/dashboard`.

**Tech Stack:** Next.js 15, React 19, TypeScript, Lucide React, Vanilla CSS.

**Spec:** [docs/superpowers/specs/2026-10-03-landing-page-design.md](file:///c:/Users/janna/OneDrive/Documents/WATTSNAP/docs/superpowers/specs/2026-10-03-landing-page-design.md)

## Global Constraints
- Landing page must be placed in `src/app/page.tsx`.
- Landing-page components must reside in `src/features/landing/components/`.
- Styling must be consolidated in `src/app/globals.css` using modern Vanilla CSS tokens and styles.
- Web assets must be served from `public/assets/`.
- Household dashboard remains separate at `src/app/(household)/dashboard/page.tsx` (`/dashboard`).
- No generic placeholders or broken image paths.

---

### Task 1: Next.js Foundation & Public Assets Setup

**Files:**
- Create/Modify: `package.json`
- Create/Modify: `tsconfig.json`
- Create/Modify: `next.config.ts`
- Create/Modify: `src/app/layout.tsx`
- Create: `public/assets/branding/wattsnap-logo.png` (copy from `assets/branding/`)
- Create: `public/assets/branding/Cheerful Bee Robot Thumbs-Up.png` (copy from `assets/branding/`)
- Create: `src/app/(household)/dashboard/page.tsx`

**Interfaces:**
- Produces: Working Next.js development environment, public web assets, and root layout with font and metadata configuration.

- [ ] **Step 1: Write `package.json` with Next.js, React, Lucide-React, and TypeScript dependencies**
- [ ] **Step 2: Write `tsconfig.json` with Next.js paths and module resolution**
- [ ] **Step 3: Write `next.config.ts`**
- [ ] **Step 4: Copy branding assets to `public/assets/branding/`**
- [ ] **Step 5: Write `src/app/layout.tsx` with proper SEO tags and Inter font styling**
- [ ] **Step 6: Write starter `src/app/(household)/dashboard/page.tsx`**
- [ ] **Step 7: Run `npm install` and verify dependencies install without error**
- [ ] **Step 8: Commit foundation setup**

---

### Task 2: Global Design System & Styling (`src/app/globals.css`)

**Files:**
- Modify: `src/app/globals.css`

**Interfaces:**
- Produces: CSS custom properties (`--color-primary`, `--color-accent`, `--color-green`, `--glass-bg`, etc.), responsive layout utilities, typography styles, button variants, and animation keyframes (`float`, `pulse-glow`, `sparkle`).

- [ ] **Step 1: Define CSS root variables and reset**
- [ ] **Step 2: Add glassmorphism and card elevation utilities**
- [ ] **Step 3: Add button styles and badge styles matching the design**
- [ ] **Step 4: Add animations for mascot floating, subtle glow, and card interactions**
- [ ] **Step 5: Add responsive media queries for desktop, tablet, and mobile**
- [ ] **Step 6: Commit global styling changes**

---

### Task 3: Sticky Navbar Component (`src/features/landing/components/Navbar.tsx`)

**Files:**
- Create: `src/features/landing/components/Navbar.tsx`

**Interfaces:**
- Produces: `<Navbar />` component with logo, navigation links (`Home`, `Features`, `How It Works`, `About`), "Go to Dashboard" button, and "Download App" CTA.

- [ ] **Step 1: Implement `Navbar.tsx` with brand logo and mobile toggle**
- [ ] **Step 2: Wire up navigation anchor links and `/dashboard` link**
- [ ] **Step 3: Commit Navbar component**

---

### Task 4: Interactive Phone Mockup (`src/features/landing/components/PhoneMockup.tsx`)

**Files:**
- Create: `src/features/landing/components/PhoneMockup.tsx`

**Interfaces:**
- Produces: `<PhoneMockup />` component rendering an ultra-crisp CSS/SVG smartphone with the WattSnap app UI (status bar, Maria greeting, bill card of ₱2,480.00, 6 quick action cards, bottom navigation, and animated floating badges).

- [ ] **Step 1: Build phone hardware shell with notch, status indicators, and bezel**
- [ ] **Step 2: Implement app header, greeting, and monthly bill card (`₱ 2,480.00`)**
- [ ] **Step 3: Implement 6 quick action cards and bottom app navigation**
- [ ] **Step 4: Implement floating callout badges with float animations**
- [ ] **Step 5: Commit PhoneMockup component**

---

### Task 5: Hero Section (`src/features/landing/components/HeroSection.tsx`)

**Files:**
- Create: `src/features/landing/components/HeroSection.tsx`

**Interfaces:**
- Consumes: `<PhoneMockup />` from Task 4
- Produces: `<HeroSection />` component containing the tag badge, gradient headline, subhead, download buttons, mascot with aura, phone mockup, and 4 highlight cards.

- [ ] **Step 1: Implement Hero left column with headline, badge, and CTA buttons**
- [ ] **Step 2: Implement Hero right column with mascot illustration and `<PhoneMockup />`**
- [ ] **Step 3: Implement 4 bottom pill cards ("Understand Your Bills", "Monitor Usage", "Save Energy Save Money", "Helpful AI Guidance")**
- [ ] **Step 4: Commit HeroSection component**

---

### Task 6: Smart Features Section (`src/features/landing/components/FeaturesSection.tsx`)

**Files:**
- Create: `src/features/landing/components/FeaturesSection.tsx`

**Interfaces:**
- Produces: `<FeaturesSection />` with header, dual-column layout displaying the mobile mockup and 4 interactive stacked feature cards.

- [ ] **Step 1: Implement section header and typography**
- [ ] **Step 2: Implement 4 feature cards with custom icons, descriptions, and interactive hover effects**
- [ ] **Step 3: Commit FeaturesSection component**

---

### Task 7: How It Works Section (`src/features/landing/components/HowItWorksSection.tsx`)

**Files:**
- Create: `src/features/landing/components/HowItWorksSection.tsx`

**Interfaces:**
- Produces: `<HowItWorksSection />` displaying the 4-step workflow: Scan Your Bill → AI Analysis → View Insights → Take Action.

- [ ] **Step 1: Implement 4 step cards with numbered badges, icons, and text**
- [ ] **Step 2: Add connecting arrow flow indicators between steps**
- [ ] **Step 3: Commit HowItWorksSection component**

---

### Task 8: Spotlight & Testimonials Sections

**Files:**
- Create: `src/features/landing/components/SpotlightSection.tsx`
- Create: `src/features/landing/components/TestimonialsSection.tsx`

**Interfaces:**
- Produces: `<SpotlightSection />` (outage readiness & green mission cards) and `<TestimonialsSection />` (3 verified reviews with ratings).

- [ ] **Step 1: Implement `SpotlightSection.tsx` with outage alert card and sustainability card**
- [ ] **Step 2: Implement `TestimonialsSection.tsx` with user reviews (Maria S., John R., Anna L.) and 5-star ratings**
- [ ] **Step 3: Commit Spotlight and Testimonials components**

---

### Task 9: Download CTA Banner & Footer

**Files:**
- Create: `src/features/landing/components/DownloadCtaBanner.tsx`
- Create: `src/features/landing/components/Footer.tsx`

**Interfaces:**
- Produces: `<DownloadCtaBanner />` (gradient container, mascot holding phone, app store buttons) and `<Footer />` (brand identity, utility provider disclaimer, links).

- [ ] **Step 1: Implement `DownloadCtaBanner.tsx`**
- [ ] **Step 2: Implement `Footer.tsx`**
- [ ] **Step 3: Commit Download CTA and Footer components**

---

### Task 10: Page Integration & Verification

**Files:**
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: All components from Tasks 3-9
- Produces: Complete, responsive WattSnap landing page.

- [ ] **Step 1: Assemble all landing sections in `src/app/page.tsx`**
- [ ] **Step 2: Run `npm run build` to verify clean compilation with zero type or build errors**
- [ ] **Step 3: Launch local development server (`npm run dev`)**
- [ ] **Step 4: Verify visually in browser using browser subagent**
- [ ] **Step 5: Final commit and summary**
