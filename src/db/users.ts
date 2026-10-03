import { eq } from 'drizzle-orm';
import { db } from './index.ts';
import { users } from './schema.ts';

export async function getOrCreateUser(
  uid: string,
  email: string,
  displayName?: string,
  role?: string,
  organization?: string,
  licenseOrGst?: string
) {
  try {
    const existing = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    if (existing.length > 0) {
      // If role or details updated, optionally update
      if (role && existing[0].role !== role) {
        const updated = await db
          .update(users)
          .set({
            role,
            displayName: displayName || existing[0].displayName,
            organization: organization || existing[0].organization,
            licenseOrGst: licenseOrGst || existing[0].licenseOrGst,
          })
          .where(eq(users.uid, uid))
          .returning();
        return updated[0];
      }
      return existing[0];
    }

    const inserted = await db
      .insert(users)
      .values({
        uid,
        email,
        displayName: displayName || email.split('@')[0],
        role: role || 'ngo',
        organization: organization || 'Community Partner',
        licenseOrGst: licenseOrGst || 'VERIFIED-2026',
        rating: '4.8',
      })
      .returning();

    return inserted[0];
  } catch (error) {
    console.error('Error in getOrCreateUser:', error);
    throw new Error('Database user sync failed', { cause: error });
  }
}

export async function getUserByUid(uid: string) {
  try {
    const res = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    return res[0] || null;
  } catch (error) {
    console.error('Error fetching user by UID:', error);
    throw new Error('Failed to fetch user', { cause: error });
  }
}

export async function getUserById(id: number) {
  try {
    const res = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return res[0] || null;
  } catch (error) {
    console.error('Error fetching user by ID:', error);
    throw new Error('Failed to fetch user', { cause: error });
  }
}
