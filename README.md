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
