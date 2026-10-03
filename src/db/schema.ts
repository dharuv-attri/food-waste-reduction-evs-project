import { relations } from 'drizzle-orm';
import { boolean, integer, numeric, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// User accounts & RBAC
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID or system role UID
  email: text('email').notNull(),
  role: text('role').notNull().default('ngo'), // 'restaurant' | 'ngo' | 'mediator' | 'delivery' | 'biogas' | 'admin'
  displayName: text('display_name').notNull(),
  phone: text('phone'),
  organization: text('organization'),
  licenseOrGst: text('license_or_gst'),
  rating: text('rating').default('4.8'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Food surplus listings from restaurants/dhabas
export const foodListings = pgTable('food_listings', {
  id: serial('id').primaryKey(),
  restaurantId: integer('restaurant_id').references(() => users.id).notNull(),
  name: text('name').notNull(),
  emoji: text('emoji').default('🍲'),
  qtyKg: numeric('qty_kg').notNull(),
  foodType: text('food_type').notNull(), // 'Veg' | 'Non-Veg' | 'Jain'
  cuisine: text('cuisine').notNull(),
  priceType: text('price_type').notNull().default('Free'), // 'Free' | 'Paid'
  priceAmount: numeric('price_amount').default('0'),
  expiryHours: numeric('expiry_hours').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  status: text('status').notNull().default('available'), // 'available' | 'inspection' | 'approved' | 'claimed' | 'delivering' | 'delivered' | 'expired' | 'routed_to_biogas'
  aiConfidence: integer('ai_confidence').default(92),
  co2SavedKg: numeric('co2_saved_kg').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Claims created by NGOs or verified beneficiaries
export const claims = pgTable('claims', {
  id: serial('id').primaryKey(),
  foodId: integer('food_id').references(() => foodListings.id).notNull(),
  ngoId: integer('ngo_id').references(() => users.id).notNull(),
  status: text('status').notNull().default('claimed'), // 'claimed' | 'inspection_requested' | 'inspecting' | 'approved' | 'rejected' | 'delivering' | 'delivered'
  quantityClaimed: numeric('quantity_claimed').notNull(),
  deliveryAddress: text('delivery_address'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Quality inspections conducted by FSSAI-certified mediators
export const inspections = pgTable('inspections', {
  id: serial('id').primaryKey(),
  foodId: integer('food_id').references(() => foodListings.id).notNull(),
  claimId: integer('claim_id').references(() => claims.id),
  mediatorId: integer('mediator_id').references(() => users.id).notNull(),
  textureScore: text('texture_score'), // 'pass' | 'fail'
  colorScore: text('color_score'), // 'pass' | 'fail'
  hygieneScore: text('hygiene_score'), // 'pass' | 'fail'
  tempScore: text('temp_score'), // 'pass' | 'fail'
  temperatureCelsius: numeric('temperature_celsius').default('58.0'),
  aiScore: integer('ai_score').default(90),
  status: text('status').notNull().default('pending'), // 'pending' | 'passed' | 'failed'
  certificateId: text('certificate_id'),
  notes: text('notes'),
  inspectedAt: timestamp('inspected_at').defaultNow(),
});

// Cryptographically verifiable Safe Food certificates
export const safeFoodCertificates = pgTable('safe_food_certificates', {
  id: serial('id').primaryKey(),
  certNumber: text('cert_number').notNull().unique(),
  foodId: integer('food_id').references(() => foodListings.id).notNull(),
  mediatorId: integer('mediator_id').references(() => users.id).notNull(),
  claimId: integer('claim_id').references(() => claims.id),
  qualityScore: integer('quality_score').notNull(),
  validUntil: timestamp('valid_until').notNull(),
  fssaiInspectorId: text('fssai_inspector_id').notNull(),
  qrData: text('qr_data'),
  issuedAt: timestamp('issued_at').defaultNow(),
});

// Delivery partner assignments
export const deliveryJobs = pgTable('delivery_jobs', {
  id: serial('id').primaryKey(),
  type: text('type').notNull().default('food'), // 'food' | 'biogas'
  foodId: integer('food_id').references(() => foodListings.id),
  claimId: integer('claim_id').references(() => claims.id),
  driverId: integer('driver_id').references(() => users.id),
  pickupLocation: text('pickup_location').notNull(),
  dropoffLocation: text('dropoff_location').notNull(),
  distanceKm: numeric('distance_km').notNull(),
  earningsInr: numeric('earnings_inr').notNull(),
  status: text('status').notNull().default('available'), // 'available' | 'accepted' | 'in_transit' | 'delivered'
  etaMinutes: integer('eta_minutes').default(20),
  createdAt: timestamp('created_at').defaultNow(),
  completedAt: timestamp('completed_at'),
});

// Biogas conversion records for expired / rejected food waste
export const biogasBatches = pgTable('biogas_batches', {
  id: serial('id').primaryKey(),
  producerId: integer('producer_id').references(() => users.id),
  foodId: integer('food_id').references(() => foodListings.id),
  sourceName: text('source_name').notNull(),
  wasteKg: numeric('waste_kg').notNull(),
  biogasM3: numeric('biogas_m3').notNull(),
  kwhElectricity: numeric('kwh_electricity').notNull(),
  co2OffsetKg: numeric('co2_offset_kg').notNull(),
  status: text('status').notNull().default('incoming'), // 'incoming' | 'collected' | 'processed'
  createdAt: timestamp('created_at').defaultNow(),
});

// Real-time peer-to-peer and system chat with auto-translation
export const chatMessages = pgTable('chat_messages', {
  id: serial('id').primaryKey(),
  senderId: integer('sender_id').references(() => users.id).notNull(),
  recipientId: integer('recipient_id').references(() => users.id),
  roleType: text('role_type').notNull(),
  message: text('message').notNull(),
  translatedMessage: text('translated_message'),
  language: text('language').default('en'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Real-time notifications and alerts across roles
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  targetRole: text('target_role'), // null for all or specific role
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').default('info'), // 'success' | 'info' | 'warn' | 'alert'
  isRead: boolean('is_read').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  foodListings: many(foodListings),
  claims: many(claims),
  inspections: many(inspections),
  deliveryJobs: many(deliveryJobs),
  biogasBatches: many(biogasBatches),
  sentMessages: many(chatMessages),
}));

export const foodListingsRelations = relations(foodListings, ({ one, many }) => ({
  restaurant: one(users, {
    fields: [foodListings.restaurantId],
    references: [users.id],
  }),
  claims: many(claims),
  inspections: many(inspections),
}));

export const claimsRelations = relations(claims, ({ one, many }) => ({
  food: one(foodListings, {
    fields: [claims.foodId],
    references: [foodListings.id],
  }),
  ngo: one(users, {
    fields: [claims.ngoId],
    references: [users.id],
  }),
  inspections: many(inspections),
  deliveryJobs: many(deliveryJobs),
}));

export const inspectionsRelations = relations(inspections, ({ one }) => ({
  food: one(foodListings, {
    fields: [inspections.foodId],
    references: [foodListings.id],
  }),
  mediator: one(users, {
    fields: [inspections.mediatorId],
    references: [users.id],
  }),
  claim: one(claims, {
    fields: [inspections.claimId],
    references: [claims.id],
  }),
}));
