import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

// Supabase connection — prefer env var, fallback to hardcoded for initial deployment
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres.xtjjavrixvnwoulgebqp:%40CByQ8i65cLD%40T3@aws-0-us-west-2.pooler.supabase.com:6543/postgres";

const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

export const db = drizzle(pool, { schema });
