// seed.ts
// One-shot bootstrap of the first admin account. Reads three positional args:
//
//   pnpm --filter @hc/backend exec tsx src/db/seed.ts <email> <fullName> [level]
//
// Idempotent: if a user with this email exists, it is updated to role=admin
// and reactivated. Use this only for initial setup or recovery — admins can
// create new admins via /api/admin/voters once one exists.

import { eq } from 'drizzle-orm';
import { closeDb, db } from './connection.js';
import { users } from './schema/index.js';

const main = async (): Promise<void> => {
  const [emailArg, fullNameArg, levelArg] = process.argv.slice(2);

  if (!emailArg || !fullNameArg) {
    // eslint-disable-next-line no-console
    console.error('Usage: tsx src/db/seed.ts <email> "<fullName>" [level]');
    process.exit(1);
  }

  const email = emailArg.trim().toLowerCase();
  const fullName = fullNameArg.trim();
  const level = levelArg ? Number.parseInt(levelArg, 10) : 1;
  if (![1, 2, 3].includes(level)) {
    // eslint-disable-next-line no-console
    console.error('level must be 1, 2 or 3');
    process.exit(1);
  }

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email));

  if (existing.length > 0) {
    const id = existing[0]!.id;
    await db
      .update(users)
      .set({ fullName, level, role: 'admin', active: true, updatedAt: new Date() })
      .where(eq(users.id, id));
    // eslint-disable-next-line no-console
    console.log(`[hc] Updated existing user ${email} → admin (id=${id})`);
  } else {
    const inserted = await db
      .insert(users)
      .values({ email, fullName, level, role: 'admin' })
      .returning({ id: users.id });
    // eslint-disable-next-line no-console
    console.log(`[hc] Created admin ${email} (id=${inserted[0]?.id})`);
  }
};

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => {
    void closeDb();
  });
