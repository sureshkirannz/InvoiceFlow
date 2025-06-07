import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Use the provided PostgreSQL connection details
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:1234567@158.180.4.107:5432/InvoiceApp';

export const pool = new Pool({ connectionString });
export const db = drizzle({ client: pool, schema });