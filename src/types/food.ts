export interface FoodListing {
  id: number;
  restaurantId: number;
  name: string;
  emoji: string;
  qtyKg: string;
  foodType: string;
  cuisine: string;
  priceType: string;
  priceAmount: string;
  expiryHours: string;
  expiresAt: string;
  status: string;
  aiConfidence: number;
  co2SavedKg: string;
  notes: string;
  restaurantName?: string;
  restaurantOrg?: string;
  restaurantPhone?: string;
}
