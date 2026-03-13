# Supabase Schema (PostgreSQL)

Run the SQL in `supabase/schema.sql` inside Supabase SQL Editor.

## Quick Setup

1. Create a Supabase project.
2. In **Authentication → Providers**, ensure **Email** is enabled.
3. In **Authentication → URL Configuration**, set your site URL (for email verification links).
4. Open **SQL Editor** and run the full contents of `supabase/schema.sql`.
5. In **Project Settings → API**, copy:
   - Project URL
   - `anon` public key
6. Create `.env` from `.env.example` and set:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
7. Restart the dev server with `npm run dev`.

## Notes

- `app_users` is now a profile table linked to Supabase Auth via `auth_user_id`.
- Passwords are managed by Supabase Auth and are not stored in application tables.
- RLS policies allow authenticated users to manage app data and only manage their own profile row.
- `products` includes both `unit_price` and `unit_currency` (e.g., `FCFA`, `USD`, `NGN`) for recipe pricing.
- `materials` includes `cost_price`, `cost_currency` (e.g., `FCFA`, `USD`, `NGN`), and `purchase_date`.
- `sales` stores product sales rows: quantity sold, unit price/currency, total amount, quantity left, and sale date.
