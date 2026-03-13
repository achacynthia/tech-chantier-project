# Production Tracker - Documentation

## 1) Project Name
Production Tracker

## 2) Project Overview
Production Tracker is a simple system that helps small businesses (bakeries, restaurants, and small factories) manage raw materials and production records.

Instead of doing manual calculations, users record production and the system automatically deducts raw materials based on configured production units (recipes).

## 3) Problem Statement
Many small producers in Cameroon face stock management challenges:
- Unexpected shortages during production
- Material waste
- Poor planning and unnecessary purchases

Production Tracker reduces these issues by giving visibility into stock and production in real time.

## 4) Users of the System
### Business Owners / Producers
- Add raw materials to stock
- Configure production units (recipes)
- Record production activities
- View stock and finished goods reports
- Receive low-stock alerts

### Admins (optional, future scope)
- Manage user accounts
- Manage system settings globally

## 5) Application Pages and Access
| Page | Purpose | Login Required | Accessible By |
|---|---|---|---|
| Home | Entry point and overview | No | Everyone |
| Login | Authenticate users | No | Everyone |
| Dashboard | Stock/production summary | Yes | Logged-in users |
| Add Stock | Add raw materials and configure recipes | Yes | Business Owners |
| Record Production | Record output and auto-update stock | Yes | Business Owners |
| Reports | View stock levels, finished goods, alerts | Yes | Business Owners |

## 6) Core Features Implemented
- Raw materials management (add new materials or increase existing stock)
- Production unit configuration per product (recipe per unit)
- Production recording with automatic raw material deduction
- Finished goods accumulation
- Dashboard metrics and low-stock alerts
- Reports for stock, finished goods, and production history
- Supabase Auth (email/password) with route protection and persisted sessions

## 7) Design Notes
Implemented based on SRS guidance:
- Primary theme: light brown
- Secondary theme: green
- Style: simple, clean, minimal for non-technical users

## 8) Tech Stack
- Frontend: React + Vite
- Routing: React Router
- Styling: CSS (with Tailwind available in project dependencies)
- Backend/Database: Supabase (PostgreSQL + Supabase JS client)
- Deployment target: Vercel
- Version control: GitHub

## 9) Current Architecture (MVP)
### State Management
- `src/context/AppContext.jsx`
- Holds auth state, materials, product recipes, production logs, and finished goods
- Exposes actions:
  - `login`, `logout`
  - `addMaterial`
  - `configureProduct`
  - `recordProduction`

### Route Protection
- `src/Components/ProtectedRoute.jsx`
- Private pages redirect to `/login` if user is not authenticated

### Layout and Navigation
- `src/Layout/Rootlayout.jsx` for shared shell
- `src/Components/NavBar.jsx` adapts links based on auth state

## 10) Limitations (Current MVP)
- No payments (out of scope)
- No advanced user/role management yet

## 11) Run Locally
1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure Supabase environment:
   ```bash
   cp .env.example .env
   ```
   Then update `.env` with your Supabase values:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. In Supabase Dashboard, enable Email auth provider and set URL configuration.
4. Initialize database schema:
   - Open Supabase SQL Editor
   - Run SQL in `supabase/schema.sql`
5. Start development server:
   ```bash
   npm run dev
   ```
6. Open the local URL shown in terminal

## 12) Suggested Next Steps
- Add role-based access control (owner/admin/staff) with stricter RLS ownership rules
- Add validation/error boundaries and API failure handling
- Add exportable reports (CSV/PDF)
