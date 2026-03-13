# PostgreSQL Schema (Simple)

Use this schema for a beginner-friendly Node + PostgreSQL setup.

## Quick Setup

1. Create a database named `postgres` (or use your existing local `postgres` DB).
2. Run all SQL from `postgres/schema.sql`.
3. Set backend environment in `backend/.env`:

	DATABASE_URL=postgres://postgres:cynthia@localhost:5432/postgres
	PORT=4000
	PG_SSL=false

4. Start backend:

	cd backend
	npm install
	npm run dev

5. Check backend health:

	http://localhost:4000/api/health

## What is in the schema

- `materials`: stock records, cost, threshold, purchase date.
- `products`: product name and unit selling price/currency.
- `product_ingredients`: recipe rows per product.
- `finished_goods`: current produced quantity left.
- `production_logs`: production history.
- `sales`: sales history and quantity left after each sale.

## Notes

- This schema is intentionally simple (no Supabase auth, no RLS policies).
- Suitable for learning and local development with Node + Express + `pg`.
