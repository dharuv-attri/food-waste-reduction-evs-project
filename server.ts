import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { requireAuth, requireRole, AuthRequest } from './src/middleware/auth.ts';
import {
  seedInitialData,
  getAllFoodListings,
  createFoodListing,
  claimFoodListing,
  getClaimsByUser,
  getPendingInspections,
  requestInspectionForFood,
  submitInspectionDecision,
  getDeliveryJobs,
  updateDeliveryJobStatus,
  getBiogasBatches,
  processBiogasBatch,
  getChatMessages,
  sendChatMessage,
  getNotifications,
  getImpactAnalytics,
} from './src/db/services.ts';
import { db } from './src/db/index.ts';
import { sql } from 'drizzle-orm';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ----------------------------------------------------
// PUBLIC HEALTH & DB STATUS
// ----------------------------------------------------
app.get('/api/health', async (_req, res) => {
  try {
    await db.execute(sql`SELECT 1`);
    res.json({
      status: 'healthy',
      database: 'connected (PostgreSQL)',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Healthcheck DB Error:', err);
    res.status(503).json({
      status: 'degraded',
      database: 'disconnected',
      error: err.message,
    });
  }
});

// ----------------------------------------------------
// AUTH & USER IDENTITY
// ----------------------------------------------------
app.get('/api/auth/me', requireAuth, (req: AuthRequest, res) => {
  res.json({
    user: req.user?.dbUser,
    uid: req.user?.uid,
    role: req.user?.dbUser.role,
  });
});

// ----------------------------------------------------
// FOOD SURPLUS LISTINGS
// ----------------------------------------------------
app.get('/api/food-listings', async (req, res) => {
  try {
    const { status, foodType, priceType, cuisine, query } = req.query;
    const listings = await getAllFoodListings({
      status: status as string,
      foodType: foodType as string,
      priceType: priceType as string,
      cuisine: cuisine as string,
      query: query as string,
    });
    res.json(listings);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch food listings' });
  }
});

// Create listing (Restricted to Restaurant and Admin)
app.post(
  '/api/food-listings',
  requireAuth,
  requireRole(['restaurant', 'admin']),
  async (req: AuthRequest, res) => {
    try {
      const restaurantUserId = req.user!.dbUser.id;
      const { name, emoji, qtyKg, foodType, cuisine, priceType, priceAmount, expiryHours, aiConfidence, notes } =
        req.body;

      if (!name || !qtyKg || !foodType || !cuisine || !expiryHours) {
        return res.status(400).json({ error: 'Missing required listing fields' });
      }

      const listing = await createFoodListing(restaurantUserId, {
        name,
        emoji,
        qtyKg: parseFloat(qtyKg),
        foodType,
        cuisine,
        priceType: priceType || 'Free',
        priceAmount: priceAmount ? parseFloat(priceAmount) : 0,
        expiryHours: parseFloat(expiryHours),
        aiConfidence: aiConfidence ? parseInt(aiConfidence) : 95,
        notes,
      });

      res.status(201).json(listing);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to create food listing' });
    }
  }
);

// ----------------------------------------------------
// CLAIMS (Restricted to NGO and Admin)
// ----------------------------------------------------
app.get('/api/claims', requireAuth, async (req: AuthRequest, res) => {
  try {
    const claimsList = await getClaimsByUser(req.user!.dbUser.id, req.user!.dbUser.role);
    res.json(claimsList);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch claims' });
  }
});

app.post(
  '/api/food-listings/:id/claim',
  requireAuth,
  requireRole(['ngo', 'admin']),
  async (req: AuthRequest, res) => {
    try {
      const foodId = parseInt(req.params.id);
      const ngoUserId = req.user!.dbUser.id;
      const { quantityClaimed, deliveryAddress, notes } = req.body;

      if (!quantityClaimed || !deliveryAddress) {
        return res.status(400).json({ error: 'Quantity claimed and delivery address are required' });
      }

      const claim = await claimFoodListing(
        ngoUserId,
        foodId,
        parseFloat(quantityClaimed),
        deliveryAddress,
        notes
      );
      res.status(201).json(claim);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to claim food' });
    }
  }
);

// ----------------------------------------------------
// INSPECTIONS (Restricted to Mediator and Admin)
// ----------------------------------------------------
app.get(
  '/api/inspections',
  requireAuth,
  requireRole(['mediator', 'admin', 'restaurant']),
  async (_req, res) => {
    try {
      const inspectionsList = await getPendingInspections();
      res.json(inspectionsList);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch inspections' });
    }
  }
);

app.post('/api/food-listings/:id/request-inspection', requireAuth, async (req: AuthRequest, res) => {
  try {
    const foodId = parseInt(req.params.id);
    const { claimId } = req.body;
    const inspection = await requestInspectionForFood(foodId, undefined, claimId);
    res.status(201).json(inspection);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to request inspection' });
  }
});

app.post(
  '/api/inspections/:id/submit',
  requireAuth,
  requireRole(['mediator', 'admin']),
  async (req: AuthRequest, res) => {
    try {
      const inspectionId = parseInt(req.params.id);
      const mediatorUserId = req.user!.dbUser.id;
      const { textureScore, colorScore, hygieneScore, tempScore, temperatureCelsius, aiScore, decision, notes } =
        req.body;

      if (!decision || (decision !== 'approve' && decision !== 'reject')) {
        return res.status(400).json({ error: 'Valid decision ("approve" or "reject") required' });
      }

      const result = await submitInspectionDecision(mediatorUserId, inspectionId, {
        textureScore: textureScore || 'pass',
        colorScore: colorScore || 'pass',
        hygieneScore: hygieneScore || 'pass',
        tempScore: tempScore || 'pass',
        temperatureCelsius: temperatureCelsius ? parseFloat(temperatureCelsius) : 58.0,
        aiScore: aiScore ? parseInt(aiScore) : 92,
        decision,
        notes,
      });

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to submit inspection decision' });
    }
  }
);

// ----------------------------------------------------
// DELIVERY (Restricted to Delivery Partner and Admin)
// ----------------------------------------------------
app.get('/api/delivery/jobs', requireAuth, requireRole(['delivery', 'admin']), async (req: AuthRequest, res) => {
  try {
    const jobs = await getDeliveryJobs(req.user!.dbUser.id);
    res.json(jobs);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch delivery jobs' });
  }
});

app.post(
  '/api/delivery/jobs/:id/accept',
  requireAuth,
  requireRole(['delivery', 'admin']),
  async (req: AuthRequest, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const driverUserId = req.user!.dbUser.id;
      const job = await updateDeliveryJobStatus(driverUserId, jobId, 'accepted');
      res.json(job);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to accept job' });
    }
  }
);

app.post(
  '/api/delivery/jobs/:id/status',
  requireAuth,
  requireRole(['delivery', 'admin']),
  async (req: AuthRequest, res) => {
    try {
      const jobId = parseInt(req.params.id);
      const driverUserId = req.user!.dbUser.id;
      const { status } = req.body;

      if (!status || (status !== 'in_transit' && status !== 'delivered')) {
        return res.status(400).json({ error: 'Invalid delivery status' });
      }

      const job = await updateDeliveryJobStatus(driverUserId, jobId, status);
      res.json(job);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update delivery status' });
    }
  }
);

// ----------------------------------------------------
// BIOGAS PRODUCER (Restricted to Biogas and Admin)
// ----------------------------------------------------
app.get('/api/biogas/batches', requireAuth, requireRole(['biogas', 'admin']), async (_req, res) => {
  try {
    const batches = await getBiogasBatches();
    res.json(batches);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch biogas batches' });
  }
});

app.post(
  '/api/biogas/batches/:id/process',
  requireAuth,
  requireRole(['biogas', 'admin']),
  async (req, res) => {
    try {
      const batchId = parseInt(req.params.id);
      const batch = await processBiogasBatch(batchId);
      res.json(batch);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to process biogas batch' });
    }
  }
);

// ----------------------------------------------------
// CHAT & NOTIFICATIONS
// ----------------------------------------------------
app.get('/api/chat', requireAuth, async (_req, res) => {
  try {
    const messages = await getChatMessages();
    res.json(messages);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch chat messages' });
  }
});

app.post('/api/chat', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }
    const msg = await sendChatMessage(req.user!.dbUser.id, message, req.user!.dbUser.role);
    res.status(201).json(msg);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to send chat message' });
  }
});

app.get('/api/notifications', requireAuth, async (req: AuthRequest, res) => {
  try {
    const notifs = await getNotifications(req.user!.dbUser.role);
    res.json(notifs);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch notifications' });
  }
});

// ----------------------------------------------------
// ANALYTICS & SDG IMPACT
// ----------------------------------------------------
app.get('/api/analytics', async (_req, res) => {
  try {
    const stats = await getImpactAnalytics();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch analytics' });
  }
});

// ----------------------------------------------------
// VITE SPA MIDDLEWARE / PRODUCTION SERVING
// ----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(Number(PORT), '0.0.0.0', async () => {
    console.log(`NourishNet Full-Stack Server running on port ${PORT}`);
    try {
      await seedInitialData();
    } catch (e) {
      console.error('Initial data seed check error:', e);
    }
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
