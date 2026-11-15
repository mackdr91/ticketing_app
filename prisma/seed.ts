/**
 * Author: Domonick Mack
 * Date: 2026-11-15
 * Description: Database seeding entry point (expanded in Phase 2 with demo accounts and sample tickets).
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const userCount = await prisma.user.count();
  console.log(`[Seed] Current user count in database: ${userCount}`);
}

main()
  .catch((error: unknown) => {
    console.error("[Seed] Fatal error during database seeding:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
