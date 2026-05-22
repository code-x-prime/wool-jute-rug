/**
 * Backfill signupSource for existing OAuth users.
 * Run once after adding signupSource: node -r dotenv/config prisma/backfill-signup-source.js
 * Users with Account records get signupSource = provider; others stay "credentials".
 */
import { prisma } from "../config/db.js";

async function main() {
  const accounts = await prisma.account.findMany({
    select: { userId: true, provider: true },
  });

  let updated = 0;
  for (const { userId, provider } of accounts) {
    await prisma.user.update({
      where: { id: userId },
      data: { signupSource: provider },
    });
    updated++;
  }
  console.log(`Updated ${updated} OAuth users with signupSource.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
