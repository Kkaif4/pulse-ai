import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  const username = "admin1"; // Exactly 6 characters
  const password = "admin123";

  console.log("🌱 Seeding database...");

  // 1. Hash the password & Seed Admin User
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const user = await prisma.user.upsert({
    where: { username },
    update: { passwordHash },
    create: { username, passwordHash },
  });
  console.log(`✅ Admin user seeded successfully: username='${user.username}'`);
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    // Client connection will close when node process ends
  });
