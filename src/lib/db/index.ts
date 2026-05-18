import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'

// Create SQLite client (in-memory for dev, file-based for prod)
const sqlite = createClient({
  url: process.env.DATABASE_URL || 'file:./db.sqlite',
})

export const db = drizzle(sqlite)

export * from "./schema"