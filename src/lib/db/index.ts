import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import { getEnv } from '../env-config'

const sqlite = createClient({
  url: getEnv().DATABASE_URL,
})

export const db = drizzle(sqlite)

export * from "./schema"