import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { getOrCreateUser } from '../db/users.ts';
import { users } from '../db/schema.ts';

export type UserRecord = typeof users.$inferSelect;

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email: string;
    dbUser: UserRecord;
  };
}

const DEMO_PERSONAS: Record<string, { email: string; displayName: string; role: string; organization: string; licenseOrGst: string }> = {
  restaurant: {
    email: 'tajmahal.ludhiana@nourishnet.in',
    displayName: 'Hotel Taj Mahal',
    role: 'restaurant',
    organization: 'Hotel Taj Mahal, Ludhiana',
    licenseOrGst: '27AAAPA1234A1Z5',
  },
  ngo: {
    email: 'akshayapatra@ngo.in',
    displayName: 'Akshaya Patra Foundation',
    role: 'ngo',
    organization: 'Akshaya Patra Foundation (Ludhiana Hub)',
    licenseOrGst: 'NGO-PB-2008-8921',
  },
  mediator: {
    email: 'ramesh.mediator@fssai.gov.in',
    displayName: 'Ramesh Kumar (FSSAI Inspector)',
    role: 'mediator',
    organization: 'FSSAI Punjab Food Safety Cell',
    licenseOrGst: 'FSSAI-MH-2024-8821',
  },
  delivery: {
    email: 'priya.delivery@nourishnet.in',
    displayName: 'Priya Sharma (Rider)',
    role: 'delivery',
    organization: 'NourishNet Quick-Fleet',
    licenseOrGst: 'PB-10-2022-DL901',
  },
  biogas: {
    email: 'contact@greenenergybiogas.in',
    displayName: 'GreenEnergy Biogas Corp',
    role: 'biogas',
    organization: 'GreenEnergy Biogas Corp, Punjab',
    licenseOrGst: 'MNRE-PB-2023-445',
  },
  admin: {
    email: 'admin@nourishnet.in',
    displayName: 'NourishNet System Admin',
    role: 'admin',
    organization: 'NourishNet Central Command',
    licenseOrGst: 'GOV-IN-NN-001',
  },
};

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const demoRoleHeader = (req.headers['x-demo-role'] as string) || '';

  if (!authHeader && !demoRoleHeader) {
    return res.status(401).json({ error: 'Unauthorized: Missing authorization token' });
  }

  try {
    let token = '';
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split('Bearer ')[1].trim();
    }

    // Check if demo token or header
    const demoKey = token.startsWith('demo-') ? token.replace('demo-', '') : demoRoleHeader;
    if (demoKey && DEMO_PERSONAS[demoKey]) {
      const persona = DEMO_PERSONAS[demoKey];
      const dbUser = await getOrCreateUser(
        `demo_${persona.role}`,
        persona.email,
        persona.displayName,
        persona.role,
        persona.organization,
        persona.licenseOrGst
      );

      req.user = {
        uid: dbUser.uid,
        email: dbUser.email,
        dbUser,
      };
      return next();
    }

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: Missing token' });
    }

    // Verify real Firebase ID Token
    const decodedToken = await adminAuth.verifyIdToken(token);
    const dbUser = await getOrCreateUser(
      decodedToken.uid,
      decodedToken.email || `${decodedToken.uid}@nourishnet.app`,
      decodedToken.name || (decodedToken.email ? decodedToken.email.split('@')[0] : 'User'),
      (req.headers['x-requested-role'] as string) || 'ngo'
    );

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
      dbUser,
    };
    next();
  } catch (error) {
    console.error('Error verifying authorization token:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
};

/**
 * Role-Based Access Control (RBAC) middleware generator
 * Checks that the authenticated user's role matches one of the allowed roles
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.dbUser) {
      return res.status(401).json({ error: 'Unauthorized: User authentication required' });
    }

    const userRole = req.user.dbUser.role;
    if (userRole === 'admin' || allowedRoles.includes(userRole)) {
      return next();
    }

    return res.status(403).json({
      error: `Forbidden: Access denied. Role '${userRole}' does not have permission to perform this action. Required: ${allowedRoles.join(', ')}`,
    });
  };
};
