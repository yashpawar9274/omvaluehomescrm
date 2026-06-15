# OM Value Homes CRM

## Overview

OM Value Homes CRM is a modern Real Estate Customer Relationship Management (CRM) platform developed specifically for real estate builders, developers, sales teams, and channel partners.

The platform helps manage leads, site visits, customer follow-ups, employee performance, bookings, and sales activities from a single centralized dashboard.

The goal of this project is to improve lead conversion, reduce missed follow-ups, increase team productivity, and provide better visibility into the complete customer journey.

---

## Key Features

### Lead Management

* Add and manage customer leads
* Track lead status and source
* Lead assignment to sales executives
* Lead activity history

### Site Visit Management

* Schedule customer site visits
* Track visit attendance
* Store visit feedback
* Monitor visit-to-booking conversion

### Follow-Up Tracking

* Automated follow-up reminders
* Missed follow-up monitoring
* Follow-up history management
* Priority-based lead tracking

### Employee Management

* Sales team performance tracking
* Visit and follow-up analytics
* Daily activity monitoring
* Productivity reports

### Customer Preference Tracking

* Budget preferences
* Property preferences
* Location preferences
* Customer requirement management

### Dashboard & Analytics

* Lead conversion reports
* Employee performance reports
* Site visit analytics
* Follow-up analytics
* Booking reports

---

## Technology Stack

### Frontend

* React
* TypeScript
* Vite
* Tailwind CSS

### Backend & Database

* Supabase
* PostgreSQL

### Additional Tools

* ESLint
* Prettier

---

## Business Problem Solved

In the real estate industry, many potential customers are lost due to:

* Missed follow-ups
* Unorganized lead management
* Lack of employee performance tracking
* Manual visit management
* Poor reporting systems

OM Value Homes CRM solves these challenges by providing a centralized digital workflow for the entire sales process.

---

## Project Status

Current Version: V1.0

Development Status:

* Active Development
* Internal Business Use
* Real Estate Sales Operations

---

## AI Contribution Disclaimer

This project was conceptualized, planned, designed, and managed by Yash Pawar.

Artificial Intelligence tools (including ChatGPT and AI coding assistants) were used to assist with:

* Feature planning
* UI/UX brainstorming
* Technical architecture suggestions
* Documentation writing
* Code generation assistance
* Debugging support

All business logic, workflow decisions, product vision, feature requirements, and final implementation decisions were created, reviewed, and approved by Yash Pawar.

AI was used as a development assistant, while the product idea, execution strategy, and project ownership remain solely with the project creator.

---

## Author

Yash Pawar

Founder & Developer

OM Value Homes CRM

---

## License

This project is proprietary software developed for OM Value Homes.

All rights reserved.

---

## Recent Fixes & Changelog

### Fix — "Could not find 'flat' column in leads schema cache" (v1.0.x)

**Issue (Before):**
When adding or importing a lead with a flat-type preference (1 BHK / 2 BHK / 3 BHK / Shop / Office), the app threw a PostgREST schema-cache error:

> `Could not find the 'flat_type' column of 'leads' in the schema cache`

The `leads` table in the database did not have a `flat_type` column, but the frontend (Add Lead form and CSV/Excel Import) was sending it.

**Root Cause:**
Application code was deployed referencing `leads.flat_type`, but no migration had added the column to the database.

**Fix (After):**
A migration was applied that adds the `flat_type` enum column to the `leads` table and reloads PostgREST's schema cache:

```sql
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS flat_type public.flat_type;
NOTIFY pgrst, 'reload schema';
```

After this migration:
- Add Lead form saves the selected flat type correctly.
- CSV/Excel import maps `flat`, `bhk`, `flattype`, or `requirement` columns into `flat_type`.
- Lead cards now show **Need:** 1 BHK / 2 BHK / 3 BHK / Shop / Office.

### Lead Upload (CSV / Excel Import) — How To Use

1. Go to **Leads** → click **Import**.
2. Select a `.csv`, `.xlsx`, or `.xls` file.
3. Supported column headers (case/space-insensitive):
   - `name` / `customer_name`
   - `mobile` / `phone`
   - `email`
   - `city`
   - `flat` / `bhk` / `flattype` / `requirement` — values: `1bhk`, `2bhk`, `3bhk`, `shop`, `office` (or just `1`, `2`, `3`)
   - `source` — facebook_ads / google_ads / website / walk_in / reference / whatsapp / property_portal
   - `budget` — numeric (single value or `min-max`)
4. Click **Upload** — leads are inserted in bulk and auto-assigned per admin rules.

### Screenshots

> Place screenshots under `docs/screenshots/` and they will render here.

| Before (error) | After (fixed) |
| --- | --- |
| ![Before](docs/screenshots/before-flat-error.png) | ![After](docs/screenshots/after-flat-fixed.png) |

| Lead Import | Add Lead Form |
| --- | --- |
| ![Import](docs/screenshots/lead-import.png) | ![Add Lead](docs/screenshots/add-lead.png) |

---

## 📱 PWA & Offline Support

Om Value Homes CRM is a fully installable **Progressive Web App (PWA)** with offline support.

### Features
- ✅ **Installable** on Android, iOS, Windows, macOS (Add to Home Screen)
- ✅ **Offline Page** — beautiful branded screen jab internet nahi ho
- ✅ **Service Worker** caching (network-first for pages, stale-while-revalidate for assets)
- ✅ **Online/Offline Indicator** — top pill notification jab connection drop ho
- ✅ **Auto reconnect** — internet wapas aate hi page automatically reload
- ✅ **Standalone display** — looks and feels like a native app (no browser UI)
- ✅ **Theme color & splash** screens via manifest

### How to Install on Android
1. Published URL kholo: `https://omvaluehomescrm.lovable.app`
2. Chrome menu (⋮) → **Install app** / **Add to Home screen**
3. App icon home screen pe aa jayegi — native app jaisa launch hoga

### How to Install on iOS
1. Safari me URL kholo
2. Share button → **Add to Home Screen**

### Offline Behavior
- App shell aur visited pages **cached** hoti hain
- Internet kat-ne pe `/offline.html` (custom branded page) show hota hai
- Supabase API calls (leads, auth) ke liye internet zaruri hai — woh cache nahi hote (data freshness ke liye)
- Connection wapas aate hi sab realtime sync ho jata hai

### Convert to Android APK / Play Store

App ko native Android APK me convert karne ke 3 tarike:

**1. PWABuilder (sabse easy — recommended)**
- Visit: <https://www.pwabuilder.com>
- URL daalo: `https://omvaluehomescrm.lovable.app`
- "Package for Stores" → **Android** → APK/AAB download
- Play Store pe upload kar sakte ho

**2. Bubblewrap CLI (Google official TWA)**
```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest=https://omvaluehomescrm.lovable.app/manifest.webmanifest
bubblewrap build
```
Generates a signed `.apk` / `.aab` ready for Play Store.

**3. Capacitor (full native wrapper)**
```bash
npm i @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Om Value Homes" "com.omvaluehomes.crm"
npx cap add android
npx cap open android
```
Android Studio se build → APK.

### Developer Notes
- Service worker (`public/sw.js`) sirf production domain pe register hota hai
- Lovable preview/iframe me SW disabled hai (stale cache issues avoid karne ke liye)
- Kill switch: append `?sw=off` to URL to force-unregister
- Cache version bump: edit `VERSION` constant in `public/sw.js`

### Files
| File | Purpose |
|------|---------|
| `public/sw.js` | Service worker (offline + caching) |
| `public/offline.html` | Branded offline fallback page |
| `public/manifest.webmanifest` | PWA manifest (install metadata) |
| `src/lib/register-sw.ts` | SW registration with preview guards |
| `src/components/offline-indicator.tsx` | Top pill jab offline ho |
