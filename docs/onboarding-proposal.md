# WattSnap — Onboarding UI/UX Implementation Plan

## 1. Project Objective

Design and implement a modern, visually appealing, and senior-friendly onboarding experience for **WattSnap**, an AI-assisted household electricity management application. The onboarding system must introduce new users to the application's features, guide them through account creation, and help them complete their initial household setup. Maintain the existing WattSnap branding, mascot, navigation structure, and overall visual identity. The experience should be responsive, accessible, professional, and easy to navigate, particularly for senior citizens and first-time technology users.

## 2. Splash Screen and App Introduction

Implement the existing WattSnap splash animation as the application's initial visual experience. Preserve the approved mascot design, logo, colors, and animation sequence without unnecessary modifications. The splash screen should transition smoothly into the introductory onboarding screens for first-time users. Returning users should bypass introductory onboarding once it has been completed or skipped. Avoid loading indicators or unnecessary animations that delay access to the application.

## 3. Pre-Registration Onboarding Screens

Create four interactive introductory onboarding screens that appear before account creation. Use the provided onboarding UI reference as inspiration for its clean layout, large typography, illustrations, progress indicators, and navigation placement. Each screen should highlight one major benefit of WattSnap while keeping descriptions short and understandable.

**Screen 1 — Welcome to WattSnap**

Headline: **Smarter Energy. Easier Days.**

Description: Understand your electricity, manage your home, and discover simple ways to save.

Display the original WattSnap mascot with a friendly, energy-efficient home illustration. Include a prominent **Get Started** button and a secondary **Already have an account? Sign In** option.

**Screen 2 — Understand Your Electricity Bills**

Headline: **Know Your Bill at a Glance.**

Description: Scan your electricity bill and easily understand your consumption, due date, and amount due.

Show a simplified preview of the AI Electricity Bill Scanner with billing information cards. Include the mascot interacting with a scanned electricity bill.

**Screen 3 — Understand Your Home's Energy Usage**

Headline: **See Where Your Energy Goes.**

Description: Register household appliances, scan their wattage labels, and estimate electricity consumption.

Display an appliance registration preview featuring recognizable household appliances and their estimated electricity usage. Make it clear that these figures are estimates rather than directly measured consumption.

**Screen 4 — Save Smarter and Stay Informed**

Headline: **Save Smarter. Stay Informed.**

Description: Discover personalized Tipid Tips and understand electricity-provider advisories that may affect your household.

Display sample energy-saving recommendations and a simplified provider advisory card. Feature the WattSnap mascot making a cheerful peace sign.

All four screens should include consistent progress indicators, smooth transitions, clearly labeled navigation controls, and a Skip option that allows users to proceed directly to authentication.

## 4. Account Creation and Login

After completing or skipping introductory onboarding, direct users to the existing Create Account or Login interface. Maintain the application's current authentication functionality and avoid unnecessary changes to its backend implementation.

Ensure that account creation and login forms use readable labels, appropriate input validation, understandable error messages, and large touch-friendly controls. After successful registration, direct new users to the household setup experience. Returning users should proceed to their dashboard without repeating introductory onboarding.

Preserve previously completed onboarding and household information when users log out and sign in again.

## 5. Post-Registration Household Setup Checklist

Implement a five-step interactive setup checklist that helps new users configure WattSnap after successful account creation. The setup process should be guided by the WattSnap mascot, which provides friendly instructions and brief explanations.

**Step 1 — Complete Household Profile**

Allow users to enter and save their basic household information and location. Explain why household details are necessary for personalized electricity information.

**Step 2 — Select Electricity Provider**

Allow users to confirm their electricity distribution utility or electric cooperative. With permission, use their current location to suggest likely electricity providers. Always provide a manual selection option and require confirmation before saving.

**Step 3 — Scan Your First Electricity Bill**

Guide users through capturing or uploading their first electricity bill. Display the extracted billing period, amount due, due date, and kWh consumption. Allow users to verify and correct the extracted values before saving the confirmed bill.

**Step 4 — Register Your First Appliance**

Allow users to register an appliance through manual entry or by scanning its specification/nameplate label. Include appliance type, wattage, number of units, and estimated operating hours. Require verification of scanned information before saving.

**Step 5 — Explore Personalized Tipid Tips**

Introduce users to the energy-saving recommendation feature. Provide personalized recommendations when sufficient verified household information is available, and explain that recommendations depend on saved electricity and appliance records.

Each checklist item should automatically change to Completed only after the corresponding requirement is successfully fulfilled. Do not mark steps as completed merely because the user opened a screen.

## 6. Checklist Progress Notification on the Dashboard

After account creation, allow users to access the main dashboard even if they have not completed all five setup steps.

Add a compact, visually appealing **Checklist Progress** card directly below the existing personalized greeting banner, such as **"Good morning, Kris!"**.

The notification should contain:

- The original WattSnap mascot holding or pointing toward a checklist.
- Heading: **Your Home Setup Progress**
- Supporting text: **You've completed 2 of 5 setup steps. Keep going!**
- A green progress indicator reflecting the actual completion percentage.
- A status label such as **2/5 Completed**.
- A clearly visible arrow or **Continue Setup** action.

The card should dynamically update based on the user's actual completed steps. Tapping the card should open the setup checklist and allow users to continue from an incomplete step.

When all five tasks are completed, display a friendly confirmation such as **"You're all set! Your WattSnap home setup is complete."** After acknowledgment, the completed setup notification may be dismissed or replaced by a less prominent completion indicator.

## 7. WattSnap Mascot and AI Guidance

Integrate the existing WattSnap mascot as a friendly guide throughout the onboarding and setup experience. The mascot should provide contextual instructions, encouragement, and clear feedback without interfering with important user interactions.

Use appropriate facial expressions and gestures for different states, including welcoming new users, explaining features, celebrating completed steps, and providing helpful reminders.

Preserve the approved mascot's proportions, cyan-and-white body, yellow accents, antennae, wings, and recognizable facial appearance. Avoid redesigning or replacing the mascot.

Use animations selectively, with subtle floating movements, friendly gestures, and smooth transitions. Avoid excessive glowing effects, distracting movements, or unnecessary animations.

## 8. UI/UX Design System and Accessibility

Use the established WattSnap branding with a clean and senior-friendly interface.

**Primary visual direction:**

- Cyan and blue for primary branding and selected interface elements.
- Green for positive states, completed tasks, and energy-saving elements.
- White and soft off-white for backgrounds and content surfaces.
- Yellow for highlights and friendly energy-related accents.
- Dark navy for readable primary text.

Use rounded cards, soft shadows, subtle gradients, recognizable icons, and consistent spacing. Keep the default interface in **Light Mode**, with an optional Dark Mode available through the application settings.

Apply accessibility principles throughout the experience, including readable typography, strong text contrast, large touch targets, descriptive labels, sufficient spacing, visible interaction feedback, and simple instructions.

All onboarding screens should adapt properly to different mobile screen sizes. Prioritize usability over decorative effects.

## 9. Navigation and User Flow

Implement the following navigation sequence:

**First-Time User:**

Splash Screen → Introductory Onboarding → Create Account → Household Setup Checklist → Home Dashboard

**Returning User (Authenticated):**

Splash Screen → Home Dashboard

**Returning User (Not Authenticated):**

Splash Screen → Login → Home Dashboard

Users must be able to skip the introductory onboarding and access the authentication screen. After authentication, users may postpone incomplete setup tasks and continue using available dashboard features.

The setup checklist must remain accessible from the dashboard until completed.

Avoid redirect loops, duplicate onboarding screens, unnecessary repeated animations, and navigation conflicts.

## 10. Progress Tracking and Data Persistence

Implement persistent onboarding and checklist progress tracking using the application's existing data-management architecture.

Track whether introductory onboarding has been completed or skipped, whether the user has authenticated, and which household setup requirements have been fulfilled.

Derive checklist completion from actual confirmed household records whenever possible. Calculate progress dynamically based on the five requirements.

Ensure progress remains available after app refreshes, navigation changes, and subsequent logins. Keep account-specific checklist information separate for each household.

For offline-first functionality, previously saved setup data and progress should remain accessible without an internet connection. New Gemini-powered scanning or AI-generated analysis should require connectivity, and the interface should explain when an internet connection is needed.

## 11. Integration With Existing WattSnap Features

Connect onboarding actions to the application's existing functional modules rather than creating unnecessary duplicate features.

The setup checklist should reuse existing household profile management, electricity-provider selection, AI Electricity Bill Scanner, appliance registration, and Tipid Tips functionality.

Ensure that onboarding navigation uses the same data sources, verified records, and validation rules as the main application.

Do not modify existing electricity calculations, consumption tracking logic, provider advisory processing, or unrelated dashboard components unless changes are necessary for onboarding integration.

Preserve current working functionality and avoid breaking existing routes, components, or user records.

## 12. Testing and Quality Assurance

Verify the onboarding experience across the following scenarios:

- New user opening WattSnap for the first time.
- User completing all four introductory screens.
- User skipping introductory onboarding.
- New account registration.
- Returning user login.
- User leaving the setup checklist incomplete.
- User completing setup tasks in a different order.
- Automatic updating of checklist progress.
- Application refresh during onboarding.
- Logging out and logging back in.
- Offline access to previously saved setup information.
- Correct Light Mode and Dark Mode rendering.
- Mobile responsiveness and accessibility for senior users.

Ensure that no checklist task is marked complete without meeting its corresponding requirement and that previously saved information is preserved.

## 13. Recommended Implementation Order

Implement the experience incrementally to minimize integration issues.

**Phase 1:** Review the existing application structure, authentication flow, design system, and reusable components.

**Phase 2:** Implement the introductory onboarding screens and their navigation.

**Phase 3:** Connect introductory onboarding to existing account creation and login routes.

**Phase 4:** Implement the five-step household setup checklist and progress persistence.

**Phase 5:** Integrate the Checklist Progress notification below the dashboard greeting banner.

**Phase 6:** Add mascot guidance, micro-interactions, responsive styling, and theme compatibility.

**Phase 7:** Perform functional testing, accessibility checks, and final UI polishing.

**Important Development Instruction:** Before implementing any changes, analyze the current WattSnap codebase and identify existing components, routes, styles, authentication logic, and data structures that can be reused. Follow the project's established coding conventions. Make changes incrementally, avoid unnecessary modifications to unrelated files, and preserve all existing working functionality. The final result should feel like a seamless extension of WattSnap rather than a separate application.