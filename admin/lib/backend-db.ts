import { Pool } from "pg";

const globalForPg = globalThis as unknown as { backendPool: Pool | null };

export const backendPool: Pool | null = (() => {
  if (globalForPg.backendPool) return globalForPg.backendPool;
  if (!process.env.BACKEND_DATABASE_URL) return null;

  const pool = new Pool({
    connectionString: process.env.BACKEND_DATABASE_URL,
    max: 10,
  });

  if (process.env.NODE_ENV !== "production") globalForPg.backendPool = pool;
  return pool;
})();
