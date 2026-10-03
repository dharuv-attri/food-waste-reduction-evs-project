import { desc, eq, and, sql, or } from 'drizzle-orm';
import { db } from './index.ts';
import {
  users,
  foodListings,
  claims,
  inspections,
  safeFoodCertificates,
  deliveryJobs,
  biogasBatches,
  chatMessages,
  notifications,
} from './schema.ts';

// CO2 emission factors per kg
export const CO2_FACTORS: Record<string, number> = {
  'Veg': 1.8,
  'Non-Veg': 6.1,
  'Jain': 1.5,
  'Rice': 2.5,
  'Dal': 1.8,
};

export async function seedInitialData() {
  try {
    const existingUsers = await db.select().from(users).limit(1);
    if (existingUsers.length > 0) {
      return; // Already seeded
    }

    console.log('Seeding initial data into Cloud SQL PostgreSQL...');

    // 1. Seed demo users for each role
    const [restaurantUser] = await db
      .insert(users)
      .values({
        uid: 'demo_restaurant',
        email: 'tajmahal.ludhiana@nourishnet.in',
        displayName: 'Hotel Taj Mahal',
        role: 'restaurant',
        organization: 'Hotel Taj Mahal, Civil Lines, Ludhiana',
        licenseOrGst: '27AAAPA1234A1Z5',
        phone: '+91 98140 12345',
        rating: '4.8',
      })
      .returning();

    const [punjabiRasoiUser] = await db
      .insert(users)
      .values({
        uid: 'demo_restaurant_2',
        email: 'punjabirasoi@nourishnet.in',
        displayName: 'Punjabi Rasoi',
        role: 'restaurant',
        organization: 'Punjabi Rasoi, GT Road, Ludhiana',
        licenseOrGst: '03AAACR2938B1Z2',
        phone: '+91 98141 54321',
        rating: '4.9',
      })
      .returning();

    const [ngoUser] = await db
      .insert(users)
      .values({
        uid: 'demo_ngo',
        email: 'akshayapatra@ngo.in',
        displayName: 'Akshaya Patra Foundation',
        role: 'ngo',
        organization: 'Akshaya Patra Foundation (Ludhiana Hub)',
        licenseOrGst: 'NGO-PB-2008-8921',
        phone: '+91 98765 11223',
        rating: '5.0',
      })
      .returning();

    const [mediatorUser] = await db
      .insert(users)
      .values({
        uid: 'demo_mediator',
        email: 'ramesh.mediator@fssai.gov.in',
        displayName: 'Ramesh Kumar (FSSAI Inspector)',
        role: 'mediator',
        organization: 'FSSAI Punjab Food Safety Cell',
        licenseOrGst: 'FSSAI-MH-2024-8821',
        phone: '+91 98144 99887',
        rating: '4.9',
      })
      .returning();

    const [deliveryUser] = await db
      .insert(users)
      .values({
        uid: 'demo_delivery',
        email: 'priya.delivery@nourishnet.in',
        displayName: 'Priya Sharma (Rider)',
        role: 'delivery',
        organization: 'NourishNet Quick-Fleet',
        licenseOrGst: 'PB-10-2022-DL901',
        phone: '+91 98722 33445',
        rating: '4.9',
      })
      .returning();

    const [biogasUser] = await db
      .insert(users)
      .values({
        uid: 'demo_biogas',
        email: 'contact@greenenergybiogas.in',
        displayName: 'GreenEnergy Biogas Corp',
        role: 'biogas',
        organization: 'GreenEnergy Biogas Corp, Punjab',
        licenseOrGst: 'MNRE-PB-2023-445',
        phone: '+91 98150 77665',
        rating: '4.7',
      })
      .returning();

    // 2. Seed initial Food Listings
    const now = new Date();
    const [food1] = await db
      .insert(foodListings)
      .values({
        restaurantId: restaurantUser.id,
        name: 'Chicken Dum Biryani',
        emoji: '🍛',
        qtyKg: '10.0',
        foodType: 'Non-Veg',
        cuisine: 'Mughlai',
        priceType: 'Free',
        priceAmount: '0',
        expiryHours: '3.5',
        expiresAt: new Date(now.getTime() + 3.5 * 3600 * 1000),
        status: 'available',
        aiConfidence: 94,
        co2SavedKg: '61.0',
        notes: 'Freshly prepared for evening banquet, kept in insulated hot containers.',
      })
      .returning();

    const [food2] = await db
      .insert(foodListings)
      .values({
        restaurantId: punjabiRasoiUser.id,
        name: 'Dal Makhani + Jeera Rice',
        emoji: '🍲',
        qtyKg: '8.0',
        foodType: 'Veg',
        cuisine: 'Punjabi',
        priceType: 'Paid',
        priceAmount: '20.0',
        expiryHours: '7.0',
        expiresAt: new Date(now.getTime() + 7 * 3600 * 1000),
        status: 'approved',
        aiConfidence: 96,
        co2SavedKg: '18.4',
        notes: 'Slow-cooked black lentils, hygienic stainless containers.',
      })
      .returning();

    const [food3] = await db
      .insert(foodListings)
      .values({
        restaurantId: restaurantUser.id,
        name: 'Paneer Butter Masala',
        emoji: '🧆',
        qtyKg: '5.0',
        foodType: 'Veg',
        cuisine: 'North Indian',
        priceType: 'Paid',
        priceAmount: '30.0',
        expiryHours: '5.0',
        expiresAt: new Date(now.getTime() + 5 * 3600 * 1000),
        status: 'inspection',
        aiConfidence: 89,
        co2SavedKg: '12.5',
        notes: 'Rich tomato-cashew gravy with fresh cottage cheese.',
      })
      .returning();

    const [food4] = await db
      .insert(foodListings)
      .values({
        restaurantId: punjabiRasoiUser.id,
        name: 'Amritsari Chole Bhature',
        emoji: '🫓',
        qtyKg: '15.0',
        foodType: 'Veg',
        cuisine: 'Punjabi',
        priceType: 'Free',
        priceAmount: '0',
        expiryHours: '1.5',
        expiresAt: new Date(now.getTime() + 1.5 * 3600 * 1000),
        status: 'available',
        aiConfidence: 96,
        co2SavedKg: '27.0',
        notes: 'Prepared 2 hours ago. High demand item.',
      })
      .returning();

    const [food5] = await db
      .insert(foodListings)
      .values({
        restaurantId: restaurantUser.id,
        name: 'Kashmiri Veg Pulao',
        emoji: '🍚',
        qtyKg: '12.0',
        foodType: 'Veg',
        cuisine: 'North Indian',
        priceType: 'Paid',
        priceAmount: '10.0',
        expiryHours: '9.0',
        expiresAt: new Date(now.getTime() + 9 * 3600 * 1000),
        status: 'available',
        aiConfidence: 97,
        co2SavedKg: '30.0',
        notes: 'Basmati rice with whole dry fruits and peas.',
      })
      .returning();

    // 3. Seed Claim for Food 2
    const [claim2] = await db
      .insert(claims)
      .values({
        foodId: food2.id,
        ngoId: ngoUser.id,
        status: 'approved',
        quantityClaimed: '8.0',
        deliveryAddress: 'Akshaya Patra Community Kitchen, Gill Road, Ludhiana',
        notes: 'For distribution to 40 school children in evening batch',
      })
      .returning();

    // 4. Seed Verified Certificate for Claim 2
    const certNum = `NNT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-0821`;
    await db.insert(safeFoodCertificates).values({
      certNumber: certNum,
      foodId: food2.id,
      mediatorId: mediatorUser.id,
      claimId: claim2.id,
      qualityScore: 94,
      validUntil: new Date(now.getTime() + 6 * 3600 * 1000),
      fssaiInspectorId: mediatorUser.licenseOrGst || 'FSSAI-MH-2024-8821',
      qrData: `NOURISHNET_VERIFIED:${certNum}:FSSAI:${food2.name}:SCORE:94%`,
    });

    // 5. Seed Delivery Job for Approved Food 2
    await db.insert(deliveryJobs).values({
      type: 'food',
      foodId: food2.id,
      claimId: claim2.id,
      driverId: deliveryUser.id,
      pickupLocation: 'Punjabi Rasoi, GT Road, Ludhiana',
      dropoffLocation: 'Akshaya Patra Kitchen, Gill Road, Ludhiana',
      distanceKm: '3.4',
      earningsInr: '68.0',
      status: 'in_transit',
      etaMinutes: 12,
    });

    // 6. Seed Inspection Record for Food 3
    await db.insert(inspections).values({
      foodId: food3.id,
      mediatorId: mediatorUser.id,
      textureScore: 'pass',
      colorScore: 'pass',
      hygieneScore: 'pass',
      tempScore: 'pass',
      temperatureCelsius: '58.5',
      aiScore: 91,
      status: 'pending',
      notes: 'Initial visual check passed. Mediator on-site.',
    });

    // 7. Seed Biogas Batches (waste-to-energy)
    await db.insert(biogasBatches).values({
      producerId: biogasUser.id,
      sourceName: 'Sunrise Hotel Banquet',
      wasteKg: '22.0',
      biogasM3: '0.95',
      kwhElectricity: '4.2',
      co2OffsetKg: '44.0',
      status: 'incoming',
    });

    await db.insert(biogasBatches).values({
      producerId: biogasUser.id,
      sourceName: 'City Bakery & Pastries',
      wasteKg: '15.0',
      biogasM3: '0.65',
      kwhElectricity: '2.8',
      co2OffsetKg: '30.0',
      status: 'processed',
    });

    // 8. Seed Chat messages
    await db.insert(chatMessages).values({
      senderId: ngoUser.id,
      recipientId: restaurantUser.id,
      roleType: 'ngo',
      message: 'Namaste! We can distribute the 10kg Biryani to families in Model Town shelter.',
      translatedMessage: null,
      language: 'en',
    });

    await db.insert(chatMessages).values({
      senderId: restaurantUser.id,
      recipientId: ngoUser.id,
      roleType: 'restaurant',
      message: 'बहुत बढ़िया! खाना पूरी तरह गरम और पैक है।',
      translatedMessage: 'Wonderful! Food is completely hot and sealed in pack.',
      language: 'hi',
    });

    // 9. Seed Notifications
    await db.insert(notifications).values({
      title: '🟢 New Food Surplus Listed',
      message: 'Hotel Taj Mahal listed 10kg Chicken Biryani (Expires in 3.5 hrs)',
      type: 'success',
      targetRole: 'ngo',
    });

    await db.insert(notifications).values({
      title: '🔬 Inspection Approved',
      message: 'Mediator Ramesh Kumar verified Dal Makhani with 94% safety score',
      type: 'info',
      targetRole: 'restaurant',
    });

    await db.insert(notifications).values({
      title: '🛵 Delivery In Transit',
      message: 'Priya picked up 8kg Dal Makhani — ETA 12 minutes to Akshaya Patra',
      type: 'info',
      targetRole: 'ngo',
    });

    console.log('PostgreSQL database seeded successfully!');
  } catch (error) {
    console.error('Error seeding initial data:', error);
  }
}

// FOOD LISTINGS SERVICE
export async function getAllFoodListings(filters: {
  status?: string;
  foodType?: string;
  priceType?: string;
  cuisine?: string;
  query?: string;
}) {
  try {
    const conditions = [];

    if (filters.status && filters.status !== 'All') {
      conditions.push(eq(foodListings.status, filters.status));
    }
    if (filters.foodType && filters.foodType !== 'All') {
      conditions.push(eq(foodListings.foodType, filters.foodType));
    }
    if (filters.priceType && filters.priceType !== 'All') {
      conditions.push(eq(foodListings.priceType, filters.priceType));
    }
    if (filters.cuisine && filters.cuisine !== 'All') {
      conditions.push(eq(foodListings.cuisine, filters.cuisine));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const listings = await db
      .select({
        id: foodListings.id,
        restaurantId: foodListings.restaurantId,
        name: foodListings.name,
        emoji: foodListings.emoji,
        qtyKg: foodListings.qtyKg,
        foodType: foodListings.foodType,
        cuisine: foodListings.cuisine,
        priceType: foodListings.priceType,
        priceAmount: foodListings.priceAmount,
        expiryHours: foodListings.expiryHours,
        expiresAt: foodListings.expiresAt,
        status: foodListings.status,
        aiConfidence: foodListings.aiConfidence,
        co2SavedKg: foodListings.co2SavedKg,
        notes: foodListings.notes,
        createdAt: foodListings.createdAt,
        restaurantName: users.displayName,
        restaurantOrg: users.organization,
        restaurantPhone: users.phone,
      })
      .from(foodListings)
      .leftJoin(users, eq(foodListings.restaurantId, users.id))
      .where(whereClause)
      .orderBy(desc(foodListings.createdAt));

    if (filters.query) {
      const q = filters.query.toLowerCase();
      return listings.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.cuisine.toLowerCase().includes(q) ||
          l.foodType.toLowerCase().includes(q) ||
          (l.restaurantName && l.restaurantName.toLowerCase().includes(q))
      );
    }

    return listings;
  } catch (error) {
    console.error('Error fetching food listings:', error);
    throw new Error('Failed to retrieve food listings', { cause: error });
  }
}

export async function createFoodListing(
  restaurantUserId: number,
  data: {
    name: string;
    emoji?: string;
    qtyKg: number;
    foodType: 'Veg' | 'Non-Veg' | 'Jain';
    cuisine: string;
    priceType: 'Free' | 'Paid';
    priceAmount?: number;
    expiryHours: number;
    aiConfidence?: number;
    notes?: string;
  }
) {
  try {
    const factor = CO2_FACTORS[data.foodType] || 2.0;
    const co2Saved = (data.qtyKg * factor).toFixed(1);
    const expiresAt = new Date(Date.now() + data.expiryHours * 3600 * 1000);

    const [listing] = await db
      .insert(foodListings)
      .values({
        restaurantId: restaurantUserId,
        name: data.name,
        emoji: data.emoji || '🍲',
        qtyKg: data.qtyKg.toString(),
        foodType: data.foodType,
        cuisine: data.cuisine,
        priceType: data.priceType,
        priceAmount: (data.priceAmount || 0).toString(),
        expiryHours: data.expiryHours.toString(),
        expiresAt,
        status: 'available',
        aiConfidence: data.aiConfidence || 95,
        co2SavedKg: co2Saved,
        notes: data.notes || '',
      })
      .returning();

    // Notify NGOs about new listing
    await db.insert(notifications).values({
      title: '🟢 New Food Surplus Available',
      message: `${data.qtyKg}kg ${data.name} available (${data.priceType === 'Free' ? 'FREE' : '₹' + data.priceAmount + '/kg'})`,
      type: 'success',
      targetRole: 'ngo',
    });

    return listing;
  } catch (error) {
    console.error('Error creating food listing:', error);
    throw new Error('Failed to create food listing', { cause: error });
  }
}

// CLAIM SERVICE
export async function claimFoodListing(
  ngoUserId: number,
  foodId: number,
  quantityClaimed: number,
  deliveryAddress: string,
  notes?: string
) {
  try {
    const [food] = await db.select().from(foodListings).where(eq(foodListings.id, foodId)).limit(1);
    if (!food) {
      throw new Error('Food listing not found');
    }
    if (food.status !== 'available' && food.status !== 'approved') {
      throw new Error(`Food listing is not available for claim (current status: ${food.status})`);
    }

    const [claim] = await db
      .insert(claims)
      .values({
        foodId,
        ngoId: ngoUserId,
        quantityClaimed: quantityClaimed.toString(),
        deliveryAddress,
        notes: notes || '',
        status: 'claimed',
      })
      .returning();

    // Update listing status
    await db.update(foodListings).set({ status: 'claimed' }).where(eq(foodListings.id, foodId));

    // Notify restaurant and mediators
    await db.insert(notifications).values({
      title: '🤲 Food Claim Submitted',
      message: `Claim for ${quantityClaimed}kg ${food.name} placed. Quality inspection requested.`,
      type: 'info',
      targetRole: 'mediator',
    });

    return claim;
  } catch (error) {
    console.error('Error claiming food listing:', error);
    throw new Error('Failed to claim food listing', { cause: error });
  }
}

export async function getClaimsByUser(userId: number, role: string) {
  try {
    let whereCondition = undefined;
    if (role === 'ngo') {
      whereCondition = eq(claims.ngoId, userId);
    }

    const results = await db
      .select({
        id: claims.id,
        foodId: claims.foodId,
        ngoId: claims.ngoId,
        status: claims.status,
        quantityClaimed: claims.quantityClaimed,
        deliveryAddress: claims.deliveryAddress,
        notes: claims.notes,
        createdAt: claims.createdAt,
        foodName: foodListings.name,
        foodEmoji: foodListings.emoji,
        foodType: foodListings.foodType,
        priceType: foodListings.priceType,
        priceAmount: foodListings.priceAmount,
        restaurantId: foodListings.restaurantId,
        restaurantName: users.displayName,
      })
      .from(claims)
      .innerJoin(foodListings, eq(claims.foodId, foodListings.id))
      .leftJoin(users, eq(foodListings.restaurantId, users.id))
      .where(whereCondition)
      .orderBy(desc(claims.createdAt));

    return results;
  } catch (error) {
    console.error('Error fetching claims:', error);
    throw new Error('Failed to retrieve claims', { cause: error });
  }
}

// INSPECTIONS & QUALITY MEDIATOR SERVICE
export async function getPendingInspections() {
  try {
    const list = await db
      .select({
        id: inspections.id,
        foodId: inspections.foodId,
        claimId: inspections.claimId,
        status: inspections.status,
        textureScore: inspections.textureScore,
        colorScore: inspections.colorScore,
        hygieneScore: inspections.hygieneScore,
        tempScore: inspections.tempScore,
        temperatureCelsius: inspections.temperatureCelsius,
        aiScore: inspections.aiScore,
        certificateId: inspections.certificateId,
        inspectedAt: inspections.inspectedAt,
        foodName: foodListings.name,
        foodEmoji: foodListings.emoji,
        qtyKg: foodListings.qtyKg,
        foodType: foodListings.foodType,
        expiresAt: foodListings.expiresAt,
        restaurantName: users.displayName,
        restaurantOrg: users.organization,
      })
      .from(inspections)
      .innerJoin(foodListings, eq(inspections.foodId, foodListings.id))
      .leftJoin(users, eq(foodListings.restaurantId, users.id))
      .orderBy(desc(inspections.inspectedAt));

    return list;
  } catch (error) {
    console.error('Error fetching inspections:', error);
    throw new Error('Failed to retrieve inspections', { cause: error });
  }
}

export async function requestInspectionForFood(foodId: number, mediatorUserId?: number, claimId?: number) {
  try {
    // If mediator not specified, assign default mediator
    let mediatorId = mediatorUserId;
    if (!mediatorId) {
      const [defaultMediator] = await db.select().from(users).where(eq(users.role, 'mediator')).limit(1);
      mediatorId = defaultMediator ? defaultMediator.id : 1;
    }

    const [inspection] = await db
      .insert(inspections)
      .values({
        foodId,
        claimId: claimId || null,
        mediatorId,
        status: 'pending',
        textureScore: 'pending',
        colorScore: 'pending',
        hygieneScore: 'pending',
        tempScore: 'pending',
      })
      .returning();

    await db.update(foodListings).set({ status: 'inspection' }).where(eq(foodListings.id, foodId));

    await db.insert(notifications).values({
      title: '🔬 Urgent Inspection Dispatched',
      message: `Inspection request received for listing #${foodId}. 5km radius alert sent to Mediator.`,
      type: 'warn',
      targetRole: 'mediator',
    });

    return inspection;
  } catch (error) {
    console.error('Error requesting inspection:', error);
    throw new Error('Failed to request inspection', { cause: error });
  }
}

export async function submitInspectionDecision(
  mediatorUserId: number,
  inspectionId: number,
  data: {
    textureScore: 'pass' | 'fail';
    colorScore: 'pass' | 'fail';
    hygieneScore: 'pass' | 'fail';
    tempScore: 'pass' | 'fail';
    temperatureCelsius?: number;
    aiScore: number;
    decision: 'approve' | 'reject';
    notes?: string;
  }
) {
  try {
    const [insp] = await db.select().from(inspections).where(eq(inspections.id, inspectionId)).limit(1);
    if (!insp) throw new Error('Inspection record not found');

    const [food] = await db.select().from(foodListings).where(eq(foodListings.id, insp.foodId)).limit(1);
    if (!food) throw new Error('Associated food item not found');

    const [mediator] = await db.select().from(users).where(eq(users.id, mediatorUserId)).limit(1);

    if (data.decision === 'approve') {
      const now = new Date();
      const certNumber = `NNT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(Math.floor(1000 + Math.random() * 9000))}`;
      const validUntil = new Date(now.getTime() + 4 * 3600 * 1000); // 4-hour freshness certificate

      const [cert] = await db
        .insert(safeFoodCertificates)
        .values({
          certNumber,
          foodId: food.id,
          mediatorId: mediatorUserId,
          claimId: insp.claimId,
          qualityScore: data.aiScore,
          validUntil,
          fssaiInspectorId: mediator?.licenseOrGst || 'FSSAI-INSP-2026',
          qrData: `NOURISHNET:${certNumber}:${data.aiScore}%:VALID:${validUntil.toISOString()}`,
        })
        .returning();

      await db
        .update(inspections)
        .set({
          textureScore: data.textureScore,
          colorScore: data.colorScore,
          hygieneScore: data.hygieneScore,
          tempScore: data.tempScore,
          temperatureCelsius: (data.temperatureCelsius || 58).toString(),
          aiScore: data.aiScore,
          status: 'passed',
          certificateId: certNumber,
          notes: data.notes || 'Inspection passed with AI validation.',
        })
        .where(eq(inspections.id, inspectionId));

      await db.update(foodListings).set({ status: 'approved' }).where(eq(foodListings.id, food.id));

      if (insp.claimId) {
        await db.update(claims).set({ status: 'approved' }).where(eq(claims.id, insp.claimId));
      }

      // Automatically dispatch delivery job for approved food
      await db.insert(deliveryJobs).values({
        type: 'food',
        foodId: food.id,
        claimId: insp.claimId,
        pickupLocation: 'Restaurant Kitchen (Inspected)',
        dropoffLocation: 'NGO Distribution Centre',
        distanceKm: '3.8',
        earningsInr: '76.0',
        status: 'available',
        etaMinutes: 18,
      });

      await db.insert(notifications).values({
        title: '✅ Safe Food Certified & Approved!',
        message: `Certificate ${certNumber} issued for ${food.name} (Score: ${data.aiScore}%). Ready for delivery.`,
        type: 'success',
        targetRole: 'ngo',
      });

      return { approved: true, certificate: cert };
    } else {
      // REJECTED -> Auto-route to Biogas
      await db
        .update(inspections)
        .set({
          textureScore: data.textureScore,
          colorScore: data.colorScore,
          hygieneScore: data.hygieneScore,
          tempScore: data.tempScore,
          temperatureCelsius: (data.temperatureCelsius || 42).toString(),
          aiScore: data.aiScore,
          status: 'failed',
          notes: data.notes || 'Safety thresholds not met. Re-routed to Biogas.',
        })
        .where(eq(inspections.id, inspectionId));

      await db.update(foodListings).set({ status: 'routed_to_biogas' }).where(eq(foodListings.id, food.id));

      if (insp.claimId) {
        await db.update(claims).set({ status: 'rejected' }).where(eq(claims.id, insp.claimId));
      }

      const wasteKg = parseFloat(food.qtyKg) || 10;
      const biogasM3 = (wasteKg * 0.045).toFixed(2);
      const kwh = (parseFloat(biogasM3) * 4.4).toFixed(1);
      const co2 = (wasteKg * 2.0).toFixed(1);

      await db.insert(biogasBatches).values({
        foodId: food.id,
        sourceName: `${food.name} (Quality Diverted)`,
        wasteKg: wasteKg.toString(),
        biogasM3,
        kwhElectricity: kwh,
        co2OffsetKg: co2,
        status: 'incoming',
      });

      await db.insert(deliveryJobs).values({
        type: 'biogas',
        foodId: food.id,
        pickupLocation: 'Restaurant (Spoiled food discard)',
        dropoffLocation: 'GreenEnergy Biogas Plant',
        distanceKm: '6.5',
        earningsInr: '130.0',
        status: 'available',
        etaMinutes: 28,
      });

      await db.insert(notifications).values({
        title: '⚡ Food Diverted to Biogas',
        message: `${food.name} rejected by inspector → Diverted to Renewable Energy (${biogasM3} m³ Biogas potential)`,
        type: 'warn',
        targetRole: 'biogas',
      });

      return { approved: false, routedToBiogas: true };
    }
  } catch (error) {
    console.error('Error submitting inspection decision:', error);
    throw new Error('Failed to record inspection decision', { cause: error });
  }
}

// DELIVERY JOBS SERVICE
export async function getDeliveryJobs(driverUserId?: number) {
  try {
    const list = await db
      .select({
        id: deliveryJobs.id,
        type: deliveryJobs.type,
        foodId: deliveryJobs.foodId,
        claimId: deliveryJobs.claimId,
        driverId: deliveryJobs.driverId,
        pickupLocation: deliveryJobs.pickupLocation,
        dropoffLocation: deliveryJobs.dropoffLocation,
        distanceKm: deliveryJobs.distanceKm,
        earningsInr: deliveryJobs.earningsInr,
        status: deliveryJobs.status,
        etaMinutes: deliveryJobs.etaMinutes,
        createdAt: deliveryJobs.createdAt,
        foodName: foodListings.name,
        foodEmoji: foodListings.emoji,
        qtyKg: foodListings.qtyKg,
      })
      .from(deliveryJobs)
      .leftJoin(foodListings, eq(deliveryJobs.foodId, foodListings.id))
      .orderBy(desc(deliveryJobs.createdAt));

    return list;
  } catch (error) {
    console.error('Error fetching delivery jobs:', error);
    throw new Error('Failed to retrieve delivery jobs', { cause: error });
  }
}

export async function updateDeliveryJobStatus(
  driverUserId: number,
  jobId: number,
  newStatus: 'accepted' | 'in_transit' | 'delivered'
) {
  try {
    const [job] = await db
      .update(deliveryJobs)
      .set({
        driverId: driverUserId,
        status: newStatus,
        completedAt: newStatus === 'delivered' ? new Date() : null,
      })
      .where(eq(deliveryJobs.id, jobId))
      .returning();

    if (newStatus === 'delivered' && job.foodId) {
      await db.update(foodListings).set({ status: 'delivered' }).where(eq(foodListings.id, job.foodId));
      if (job.claimId) {
        await db.update(claims).set({ status: 'delivered' }).where(eq(claims.id, job.claimId));
      }
    }

    return job;
  } catch (error) {
    console.error('Error updating delivery job:', error);
    throw new Error('Failed to update delivery job status', { cause: error });
  }
}

// BIOGAS BATCHES SERVICE
export async function getBiogasBatches() {
  try {
    return await db.select().from(biogasBatches).orderBy(desc(biogasBatches.createdAt));
  } catch (error) {
    console.error('Error fetching biogas batches:', error);
    throw new Error('Failed to retrieve biogas records', { cause: error });
  }
}

export async function processBiogasBatch(batchId: number) {
  try {
    const [batch] = await db
      .update(biogasBatches)
      .set({ status: 'processed' })
      .where(eq(biogasBatches.id, batchId))
      .returning();
    return batch;
  } catch (error) {
    console.error('Error processing biogas batch:', error);
    throw new Error('Failed to process biogas batch', { cause: error });
  }
}

// CHAT MESSAGES SERVICE
export async function getChatMessages() {
  try {
    return await db
      .select({
        id: chatMessages.id,
        senderId: chatMessages.senderId,
        roleType: chatMessages.roleType,
        message: chatMessages.message,
        translatedMessage: chatMessages.translatedMessage,
        language: chatMessages.language,
        createdAt: chatMessages.createdAt,
        senderName: users.displayName,
      })
      .from(chatMessages)
      .leftJoin(users, eq(chatMessages.senderId, users.id))
      .orderBy(chatMessages.createdAt);
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    throw new Error('Failed to retrieve chat messages', { cause: error });
  }
}

export async function sendChatMessage(senderUserId: number, message: string, roleType: string) {
  try {
    let translated: string | null = null;
    let language = 'en';

    // Simple language detection & translation simulation for Hindi/English
    if (/[\u0900-\u097F]/.test(message)) {
      language = 'hi';
      translated = `[Translated from Hindi]: ${message}`;
    }

    const [msg] = await db
      .insert(chatMessages)
      .values({
        senderId: senderUserId,
        roleType,
        message,
        translatedMessage: translated,
        language,
      })
      .returning();

    return msg;
  } catch (error) {
    console.error('Error sending chat message:', error);
    throw new Error('Failed to send chat message', { cause: error });
  }
}

// NOTIFICATIONS SERVICE
export async function getNotifications(role?: string) {
  try {
    const list = await db
      .select()
      .from(notifications)
      .where(role ? or(eq(notifications.targetRole, role), sql`${notifications.targetRole} IS NULL`) : undefined)
      .orderBy(desc(notifications.createdAt))
      .limit(20);
    return list;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw new Error('Failed to retrieve notifications', { cause: error });
  }
}

// AGGREGATE IMPACT ANALYTICS
export async function getImpactAnalytics() {
  try {
    const allListings = await db.select().from(foodListings);
    const allClaims = await db.select().from(claims);
    const allBiogas = await db.select().from(biogasBatches);

    let totalKgSaved = 0;
    let totalCo2Saved = 0;

    for (const item of allListings) {
      if (item.status === 'approved' || item.status === 'delivered' || item.status === 'claimed') {
        totalKgSaved += parseFloat(item.qtyKg) || 0;
        totalCo2Saved += parseFloat(item.co2SavedKg) || 0;
      }
    }

    let biogasGeneratedM3 = 0;
    let kwhGenerated = 0;
    for (const b of allBiogas) {
      biogasGeneratedM3 += parseFloat(b.biogasM3) || 0;
      kwhGenerated += parseFloat(b.kwhElectricity) || 0;
    }

    const mealsServed = Math.round(totalKgSaved * 4); // ~250g per meal

    return {
      totalKgSaved: Math.round(totalKgSaved * 10) / 10,
      totalCo2Saved: Math.round(totalCo2Saved * 10) / 10,
      mealsServed,
      activeListingsCount: allListings.filter((l) => l.status === 'available').length,
      inspectionsPassed: allListings.filter((l) => l.status === 'approved' || l.status === 'delivered').length,
      biogasGeneratedM3: Math.round(biogasGeneratedM3 * 100) / 100,
      kwhGenerated: Math.round(kwhGenerated * 10) / 10,
    };
  } catch (error) {
    console.error('Error calculating analytics:', error);
    throw new Error('Failed to calculate analytics', { cause: error });
  }
}
