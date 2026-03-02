import { Pool } from "pg";

const globalForPg = globalThis as unknown as { backendPool: Pool };

export const backendPool =
  globalForPg.backendPool ||
  new Pool({
    connectionString: process.env.BACKEND_DATABASE_URL,
    max: 10,
  });

if (process.env.NODE_ENV !== "production") globalForPg.backendPool = backendPool;
