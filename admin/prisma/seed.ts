import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding admin database...");

  // Only seed admin-only data. Real players/transactions/rounds come from the backend DB.

  // 1. Admin Users
  console.log("Creating admin users...");
  const passwordHash = await bcrypt.hash("admin123", 12);

  await prisma.adminUser.upsert({
    where: { email: "admin@slotsone.com" },
    update: {},
    create: { email: "admin@slotsone.com", passwordHash, name: "Admin User", role: "ADMIN" },
  });
  await prisma.adminUser.upsert({
    where: { email: "superadmin@slotsone.com" },
    update: {},
    create: {
      email: "superadmin@slotsone.com",
      passwordHash,
      name: "Super Admin",
      role: "SUPERADMIN",
    },
  });

  console.log("Seeding complete!");
  console.log("Admin login: admin@slotsone.com / admin123");
  console.log("Superadmin login: superadmin@slotsone.com / admin123");
  console.log("");
  console.log("NOTE: Player data, transactions, and game rounds now come from the backend DB.");
  console.log("Set BACKEND_DATABASE_URL in your .env.local to connect to the backend database.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
