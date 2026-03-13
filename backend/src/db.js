import dotenv from 'dotenv'
import pg from 'pg'

dotenv.config()

const { Pool } = pg

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.warn('DATABASE_URL is not set. Backend database operations will fail until configured.')
}

export const pool = new Pool({
  connectionString,
  ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false,
})

export const runQuery = (text, params = []) => pool.query(text, params)
