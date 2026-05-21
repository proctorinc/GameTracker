import { drizzle } from 'drizzle-orm/libsql'
import { createClient, Client } from '@libsql/client/node'
import * as schema from './schema'
import { getEnv } from '../env-config'

const sqlite = createClient({
  url: getEnv().DATABASE_URL,
})

export const db = drizzle(sqlite, { schema })
export const sql = sqlite as Client

export * from "./schema"

// import { drizzle } from 'drizzle-orm/better-sqlite3'
// import Database from 'better-sqlite3'
// import * as schema from './schema'
// import { getEnv } from '../env-config'

// console.log(getEnv().DATABASE_URL)
// const sqlite = new Database(getEnv().DATABASE_URL)
// export const db = drizzle(sqlite, { schema })
// export const sql = sqlite as Database.Database

// export * from "./schema"