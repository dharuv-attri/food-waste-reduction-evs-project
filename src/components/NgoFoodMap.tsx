import React, { useState, useMemo } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
} from '@vis.gl/react-google-maps';
import { MapPin, Navigation, Clock, ShieldCheck, HeartHandshake, Filter } from 'lucide-react';
import { FoodListing } from '../types/food.ts';

interface NgoFoodMapProps {
  listings: FoodListing[];
  onClaimFood: (food: FoodListing) => void;
  ngoLocation?: { lat: number; lng: number };
}

// Fixed coordinates in Ludhiana area within 5km of NGO Hub
const RESTAURANT_LOCATIONS: Record<number, { lat: number; lng: number }> = {
  1: { lat: 30.9085, lng: 75.8525 }, // Hotel Taj Mahal (~1.1 km)
  2: { lat: 30.8920, lng: 75.8650 }, // Punjabi Rasoi (~1.4 km)
  3: { lat: 30.9140, lng: 75.8710 }, // Dhaba 45 (~2.1 km)
  4: { lat: 30.8840, lng: 75.8420 }, // Amritsar Express (~2.8 km)
  5: { lat: 30.9210, lng: 75.8360 }, // Kashmiri Pulao (~3.2 km)
};

// Calculate Haversine distance in km
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export default function NgoFoodMap({ listings, onClaimFood, ngoLocation = { lat: 30.9010, lng: 75.8573 } }: NgoFoodMapProps) {
  const apiKey =
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
    'AIzaSyC9tQcgo0jAWNY0AUtNDFxYoOIFCmth6xg';

  const [selectedListing, setSelectedListing] = useState<(FoodListing & { lat: number; lng: number; distanceKm: number }) | null>(null);
  const [maxDistance, setMaxDistance] = useState<number>(5.0);
  const [filterUrgentOnly, setFilterUrgentOnly] = useState<boolean>(false);

  // Map listings to coordinates and calculate distances
  const geocodedListings = useMemo(() => {
    return listings
      .filter((l) => l.status === 'available' || l.status === 'approved')
      .map((l, index) => {
        // Fallback offset if not specifically mapped
        const coords = RESTAURANT_LOCATIONS[l.id] || {
          lat: ngoLocation.lat + (0.012 * ((index % 3) - 1)),
          lng: ngoLocation.lng + (0.014 * (((index + 1) % 3) - 1)),
        };
        const distanceKm = calculateDistance(ngoLocation.lat, ngoLocation.lng, coords.lat, coords.lng);
        return {
          ...l,
          lat: coords.lat,
          lng: coords.lng,
          distanceKm,
        };
      })
      .filter((item) => {
        if (item.distanceKm > maxDistance) return false;
        if (filterUrgentOnly && parseFloat(item.expiryHours) > 3) return false;
        return true;
      });
  }, [listings, maxDistance, filterUrgentOnly, ngoLocation]);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm space-y-3">
      {/* Map Control Header */}
      <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <h3 className="font-head text-lg font-bold text-gray-900">
              Nearby Surplus Food Map (5km Radius)
            </h3>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Real-time geolocation centered on Akshaya Patra Distribution Hub
          </p>
        </div>

        {/* Distance Range & Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            onClick={() => setMaxDistance(2.0)}
            className={`px-2.5 py-1 rounded-full font-semibold transition ${
              maxDistance === 2.0
                ? 'bg-[#E8521A] text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            &lt; 2 km
          </button>
          <button
            onClick={() => setMaxDistance(3.5)}
            className={`px-2.5 py-1 rounded-full font-semibold transition ${
              maxDistance === 3.5
                ? 'bg-[#E8521A] text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            &lt; 3.5 km
          </button>
          <button
            onClick={() => setMaxDistance(5.0)}
            className={`px-2.5 py-1 rounded-full font-semibold transition ${
              maxDistance === 5.0
                ? 'bg-[#E8521A] text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All 5 km
          </button>
          <button
            onClick={() => setFilterUrgentOnly(!filterUrgentOnly)}
            className={`px-2.5 py-1 rounded-full font-semibold transition ${
              filterUrgentOnly
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            ⏰ Urgent (&lt;3h)
          </button>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            {geocodedListings.length} Meals Found
          </span>
        </div>
      </div>

      {/* Google Maps Container */}
      <div className="relative w-full h-[400px] bg-[#E8F5EE]">
        <APIProvider apiKey={apiKey}>
          <Map
            mapId="DEMO_MAP_ID"
            defaultCenter={ngoLocation}
            defaultZoom={13}
            gestureHandling="greedy"
            disableDefaultUI={false}
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            style={{ width: '100%', height: '100%' }}
          >
            {/* Center NGO Marker */}
            <AdvancedMarker position={ngoLocation} title="Your NGO Distribution Hub">
              <div className="flex flex-col items-center cursor-pointer group">
                <div className="bg-[#2D7A4F] text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-md whitespace-nowrap mb-1">
                  🤲 Akshaya Patra Hub (You)
                </div>
                <div className="w-8 h-8 rounded-full bg-[#2D7A4F] text-white flex items-center justify-center text-sm shadow-lg ring-4 ring-[#2D7A4F]/20">
                  📍
                </div>
              </div>
            </AdvancedMarker>

            {/* Food Listing Pins */}
            {geocodedListings.map((item) => {
              const isUrgent = parseFloat(item.expiryHours) < 3.0;
              return (
                <AdvancedMarker
                  key={item.id}
                  position={{ lat: item.lat, lng: item.lng }}
                  onClick={() => setSelectedListing(item)}
                  title={`${item.name} (${item.distanceKm} km)`}
                >
                  <div className="flex flex-col items-center cursor-pointer transform hover:scale-110 transition duration-200">
                    <div className="bg-white/95 text-gray-900 border border-gray-200 text-[11px] font-extrabold px-2 py-0.5 rounded-md shadow-md whitespace-nowrap mb-0.5 flex items-center gap-1">
                      <span>{item.emoji}</span>
                      <span>{item.distanceKm} km</span>
                    </div>

                    <div
                      className={`w-9 h-9 rounded-2xl flex items-center justify-center text-lg shadow-xl ring-2 ${
                        isUrgent
                          ? 'bg-rose-500 text-white ring-rose-300 animate-pulse'
                          : item.foodType === 'Veg'
                          ? 'bg-emerald-600 text-white ring-emerald-300'
                          : 'bg-[#E8521A] text-white ring-orange-300'
                      }`}
                    >
                      {item.emoji}
                    </div>
                  </div>
                </AdvancedMarker>
              );
            })}

            {/* InfoWindow for selected food listing */}
            {selectedListing && (
              <InfoWindow
                position={{ lat: selectedListing.lat, lng: selectedListing.lng }}
                onCloseClick={() => setSelectedListing(null)}
              >
                <div className="p-1 max-w-[240px] text-gray-900 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-3xl">{selectedListing.emoji}</span>
                    <div>
                      <h4 className="font-bold text-sm leading-tight">{selectedListing.name}</h4>
                      <p className="text-[11px] text-gray-500 flex items-center gap-0.5 mt-0.5">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        <span>{selectedListing.restaurantName || 'Local Restaurant'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 bg-gray-50 p-2 rounded-lg text-[11px]">
                    <div>
                      <span className="text-gray-400">Distance:</span>
                      <strong className="text-gray-800 ml-1">{selectedListing.distanceKm} km</strong>
                    </div>
                    <div>
                      <span className="text-gray-400">Portions:</span>
                      <strong className="text-gray-800 ml-1">{selectedListing.qtyKg} kg</strong>
                    </div>
                    <div>
                      <span className="text-gray-400">Price:</span>
                      <strong className="text-emerald-700 ml-1">
                        {selectedListing.priceType === 'Free' ? 'FREE' : `₹${selectedListing.priceAmount}/kg`}
                      </strong>
                    </div>
                    <div>
                      <span className="text-gray-400">Expires:</span>
                      <strong className="text-rose-600 ml-1">{selectedListing.expiryHours}h left</strong>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onClaimFood(selectedListing);
                      setSelectedListing(null);
                    }}
                    className="w-full py-1.5 bg-[#2D7A4F] hover:bg-[#236340] text-white font-bold text-xs rounded-lg shadow-sm flex items-center justify-center gap-1 transition"
                  >
                    <HeartHandshake className="w-3.5 h-3.5" />
                    <span>Claim Surplus Meal</span>
                  </button>
                </div>
              </InfoWindow>
            )}
          </Map>
        </APIProvider>

        {/* 5km Radius Zone Legend Overlay */}
        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl border border-gray-200 shadow-md text-[11px] text-gray-700 flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#2D7A4F] inline-block" />
            <span className="font-semibold">NGO Hub (Center)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block" />
            <span>Veg Food</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
            <span>Urgent (&lt;3h)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
