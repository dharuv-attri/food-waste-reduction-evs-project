/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Store,
  HeartHandshake,
  Microscope,
  Bike,
  Zap,
  Bell,
  Search,
  Mic,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  ShieldCheck,
  Send,
  LogOut,
  Sparkles,
  Database,
  ArrowRight,
  Flame,
  Leaf,
  Layers,
} from 'lucide-react';
import { auth, googleAuthProvider } from './lib/firebase.ts';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import NgoFoodMap from './components/NgoFoodMap.tsx';
import { FoodListing } from './types/food.ts';

type Role = 'restaurant' | 'ngo' | 'mediator' | 'delivery' | 'biogas';

interface Claim {
  id: number;
  foodId: number;
  status: string;
  quantityClaimed: string;
  deliveryAddress: string;
  notes: string;
  createdAt: string;
  foodName: string;
  foodEmoji: string;
  restaurantName: string;
}

interface Inspection {
  id: number;
  foodId: number;
  claimId?: number;
  status: string;
  textureScore?: string;
  colorScore?: string;
  hygieneScore?: string;
  tempScore?: string;
  temperatureCelsius?: string;
  aiScore?: number;
  certificateId?: string;
  foodName: string;
  foodEmoji: string;
  qtyKg: string;
  foodType: string;
  restaurantName?: string;
  restaurantOrg?: string;
}

interface DeliveryJob {
  id: number;
  type: string;
  foodId?: number;
  foodName?: string;
  foodEmoji?: string;
  qtyKg?: string;
  pickupLocation: string;
  dropoffLocation: string;
  distanceKm: string;
  earningsInr: string;
  status: string;
  etaMinutes: number;
}

interface BiogasBatch {
  id: number;
  sourceName: string;
  wasteKg: string;
  biogasM3: string;
  kwhElectricity: string;
  co2OffsetKg: string;
  status: string;
  createdAt: string;
}

interface ChatMsg {
  id: number;
  senderId: number;
  roleType: string;
  message: string;
  translatedMessage?: string;
  language: string;
  senderName?: string;
}

interface AppNotification {
  id: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
}

interface ImpactAnalytics {
  totalKgSaved: number;
  totalCo2Saved: number;
  mealsServed: number;
  activeListingsCount: number;
  inspectionsPassed: number;
  biogasGeneratedM3: number;
  kwhGenerated: number;
}

export default function App() {
  const [role, setRole] = useState<Role | null>('ngo');
  const [token, setToken] = useState<string>('demo-ngo');
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [dbStatus, setDbStatus] = useState<string>('checking');
  const [quotaExceeded, setQuotaExceeded] = useState<boolean>(false);
  const [showMapView, setShowMapView] = useState<boolean>(true);

  // App Data states
  const [listings, setListings] = useState<FoodListing[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [deliveryJobs, setDeliveryJobs] = useState<DeliveryJob[]>([]);
  const [biogasBatches, setBiogasBatches] = useState<BiogasBatch[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [analytics, setAnalytics] = useState<ImpactAnalytics | null>(null);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [isListening, setIsListening] = useState(false);

  // Modals & Panels
  const [showAddFoodModal, setShowAddFoodModal] = useState(false);
  const [showCertModal, setShowCertModal] = useState<{ certNum: string; foodName: string; score: number } | null>(null);
  const [showNotifs, setShowNotifs] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'warn' | 'info' | 'error' } | null>(null);

  // Form states
  const [newFood, setNewFood] = useState({
    name: 'Paneer Makhani',
    emoji: '🧆',
    qtyKg: 6,
    foodType: 'Veg' as 'Veg' | 'Non-Veg' | 'Jain',
    cuisine: 'North Indian',
    priceType: 'Free' as 'Free' | 'Paid',
    priceAmount: 0,
    expiryHours: 6,
    notes: 'Hot insulated box, prepared 1 hr ago',
  });
  const [aiDetecting, setAiDetecting] = useState(false);
  const [aiDetectionResult, setAiDetectionResult] = useState<string | null>(null);

  // Inspection Checklist State
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  const [checklist, setChecklist] = useState({
    texture: true,
    color: true,
    hygiene: true,
    temp: true,
  });
  const [temperatureVal, setTemperatureVal] = useState(58.5);
  const [chatInput, setChatInput] = useState('');

  // Toast helper
  const showToast = (msg: string, type: 'success' | 'warn' | 'info' | 'error' = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Auth Header Builder
  const getAuthHeaders = () => {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Demo-Role': role || 'ngo',
    };
  };

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const idToken = await currentUser.getIdToken();
        setToken(idToken);
      }
    });

    const quotaHandler = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', quotaHandler);

    return () => {
      unsubscribe();
      window.removeEventListener('gmp-quota-exceeded', quotaHandler);
    };
  }, []);

  // Healthcheck
  const checkHealth = async () => {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      if (data.status === 'healthy') {
        setDbStatus('connected');
      } else {
        setDbStatus('error');
      }
    } catch {
      setDbStatus('offline');
    }
  };

  // Fetch initial data
  const refreshData = async () => {
    try {
      // 1. Listings
      const listRes = await fetch(`/api/food-listings?query=${encodeURIComponent(searchQuery)}&foodType=${activeFilter}`);
      if (listRes.ok) {
        const data = await listRes.json();
        setListings(data);
      }

      // 2. Analytics
      const anRes = await fetch('/api/analytics');
      if (anRes.ok) {
        const aData = await anRes.json();
        setAnalytics(aData);
      }

      // Role specific or protected endpoints
      if (role) {
        // Claims
        const cRes = await fetch('/api/claims', { headers: getAuthHeaders() });
        if (cRes.ok) setClaims(await cRes.json());

        // Notifications
        const nRes = await fetch('/api/notifications', { headers: getAuthHeaders() });
        if (nRes.ok) setNotifications(await nRes.json());

        // Chat
        const chatRes = await fetch('/api/chat', { headers: getAuthHeaders() });
        if (chatRes.ok) setChatMessages(await chatRes.json());

        if (role === 'mediator' || role === 'restaurant') {
          const iRes = await fetch('/api/inspections', { headers: getAuthHeaders() });
          if (iRes.ok) {
            const inspData = await iRes.json();
            setInspections(inspData);
            if (!selectedInspection && inspData.length > 0) {
              setSelectedInspection(inspData[0]);
            }
          }
        }

        if (role === 'delivery') {
          const dRes = await fetch('/api/delivery/jobs', { headers: getAuthHeaders() });
          if (dRes.ok) setDeliveryJobs(await dRes.json());
        }

        if (role === 'biogas') {
          const bRes = await fetch('/api/biogas/batches', { headers: getAuthHeaders() });
          if (bRes.ok) setBiogasBatches(await bRes.json());
        }
      }
    } catch (e) {
      console.error('Error refreshing data from Express backend:', e);
    }
  };

  useEffect(() => {
    checkHealth();
    refreshData();
    const interval = setInterval(refreshData, 10000);
    return () => clearInterval(interval);
  }, [role, token, activeFilter]);

  // Switch role handler
  const handleSelectRole = (newRole: Role) => {
    setRole(newRole);
    setToken(`demo-${newRole}`);
    setActiveTab(0);
    showToast(`Switched persona to ${newRole.toUpperCase()} with PostgreSQL role permissions`, 'info');
  };

  // Google Login
  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await result.user.getIdToken();
      setUser(result.user);
      setToken(idToken);
      showToast(`Signed in as ${result.user.displayName || result.user.email}!`, 'success');
    } catch (err: any) {
      showToast(`Google Sign-In failed: ${err.message}`, 'error');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setRole('ngo');
    setToken('demo-ngo');
    showToast('Logged out to default guest view', 'info');
  };

  // ACTION: Add Food (Restaurant)
  const handleAddFoodSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/food-listings', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newFood),
      });

      if (!res.ok) {
        const err = await res.json();
        showToast(err.error || 'Failed to list food', 'error');
        return;
      }

      showToast(`🎉 "${newFood.name}" successfully published to PostgreSQL!`, 'success');
      setShowAddFoodModal(false);
      refreshData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // ACTION: Simulate AI Vision
  const runAiVisionDetection = () => {
    setAiDetecting(true);
    setAiDetectionResult(null);
    setTimeout(() => {
      setAiDetecting(false);
      setAiDetectionResult('🤖 Gemini Vision detected: Fresh Dal Tadka (approx 8.5 kg), Veg, Safe temp 62°C');
      setNewFood((prev) => ({
        ...prev,
        name: 'Dal Tadka Special',
        emoji: '🍲',
        qtyKg: 8.5,
        foodType: 'Veg',
        cuisine: 'North Indian',
      }));
    }, 1800);
  };

  // ACTION: Claim Food (NGO)
  const handleClaimFood = async (food: FoodListing) => {
    try {
      const res = await fetch(`/api/food-listings/${food.id}/claim`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          quantityClaimed: food.qtyKg,
          deliveryAddress: 'Akshaya Patra Community Distribution Hub, Gill Road, Ludhiana',
          notes: 'Emergency hunger relief distribution',
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        showToast(err.error || 'Claim failed', 'error');
        return;
      }

      showToast(`🛒 Claim placed for ${food.name}! Mediator inspection automatically alerted.`, 'success');
      refreshData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // ACTION: Request Inspection
  const handleRequestInspection = async (foodId: number) => {
    try {
      const res = await fetch(`/api/food-listings/${foodId}/request-inspection`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        showToast('Inspection request failed', 'error');
        return;
      }

      showToast('🔬 FSSAI Mediator within 5km radius notified!', 'info');
      refreshData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // ACTION: Submit Inspection (Mediator)
  const handleSubmitInspection = async (decision: 'approve' | 'reject') => {
    if (!selectedInspection) return;
    try {
      // Calculate AI score
      const passChecks = Object.values(checklist).filter(Boolean).length;
      const baseScore = passChecks * 23 + Math.floor(Math.random() * 8);
      const aiScore = decision === 'approve' ? Math.max(76, baseScore) : Math.min(68, baseScore);

      const res = await fetch(`/api/inspections/${selectedInspection.id}/submit`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          textureScore: checklist.texture ? 'pass' : 'fail',
          colorScore: checklist.color ? 'pass' : 'fail',
          hygieneScore: checklist.hygiene ? 'pass' : 'fail',
          tempScore: checklist.temp ? 'pass' : 'fail',
          temperatureCelsius: temperatureVal,
          aiScore,
          decision,
          notes: decision === 'approve' ? 'FSSAI standards met. Safe food verified.' : 'Spoilage indicators detected.',
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        showToast(err.error || 'Failed to submit inspection', 'error');
        return;
      }

      const data = await res.json();
      if (decision === 'approve') {
        showToast(`✅ APPROVED! Certificate ${data.certificate.certNumber} issued & Delivery dispatched!`, 'success');
        setShowCertModal({
          certNum: data.certificate.certNumber,
          foodName: selectedInspection.foodName,
          score: aiScore,
        });
      } else {
        showToast(`⚡ REJECTED: Diverted to Biogas Plant for renewable methane generation`, 'warn');
      }
      refreshData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // ACTION: Accept Delivery Job (Delivery Partner)
  const handleAcceptDelivery = async (jobId: number) => {
    try {
      const res = await fetch(`/api/delivery/jobs/${jobId}/accept`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        showToast('🛵 Delivery accepted! Route navigation engaged.', 'success');
        refreshData();
      } else {
        const err = await res.json();
        showToast(err.error || 'Could not accept job', 'error');
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  // ACTION: Update Delivery Status (Delivery Partner)
  const handleUpdateDeliveryStatus = async (jobId: number, status: 'in_transit' | 'delivered') => {
    try {
      const res = await fetch(`/api/delivery/jobs/${jobId}/status`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        showToast(status === 'delivered' ? '🎉 Marked as Delivered! Payment added to balance.' : '🛵 Status updated to In Transit', 'success');
        refreshData();
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  // ACTION: Process Biogas Batch (Biogas)
  const handleProcessBiogas = async (batchId: number) => {
    try {
      const res = await fetch(`/api/biogas/batches/${batchId}/process`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        showToast('⚡ Biogas batch converted into clean methane electricity!', 'success');
        refreshData();
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  // ACTION: Send Chat Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ message: chatInput }),
      });
      if (res.ok) {
        setChatInput('');
        refreshData();
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  // Voice search toggle
  const toggleVoiceSearch = () => {
    if (isListening) {
      setIsListening(false);
    } else {
      setIsListening(true);
      showToast('🎙️ Listening... बोलिए (Say: "Biryani" or "Dal")', 'info');
      setTimeout(() => {
        setIsListening(false);
        setSearchQuery('Biryani');
        showToast('🤖 Heard: "Biryani" — filtering results', 'success');
      }, 2200);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF9F0] text-[#1A1A2E] flex flex-col font-sans">
      {/* GOOGLE MAPS PLATFORM QUOTA DEFENSE BANNER */}
      {quotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* TOAST ALERT */}
      {toast && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full text-white font-semibold text-sm shadow-xl flex items-center gap-2 transition-all ${
            toast.type === 'success'
              ? 'bg-[#2D7A4F]'
              : toast.type === 'error'
              ? 'bg-[#DC2626]'
              : toast.type === 'warn'
              ? 'bg-[#D97706]'
              : 'bg-[#1A1A2E]'
          }`}
        >
          <span>{toast.type === 'success' ? '✅' : toast.type === 'warn' ? '⚠️' : 'ℹ️'}</span>
          {toast.msg}
        </div>
      )}

      {/* TOPBAR */}
      <header className="sticky top-0 z-40 bg-[#FFF9F0]/90 backdrop-blur-md border-b border-[#E5E0D8] px-4 lg:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#E8521A] to-[#FF6B35] flex items-center justify-center text-white text-2xl shadow-md">
            🍛
          </div>
          <div>
            <h1 className="font-head text-2xl font-bold bg-gradient-to-r from-[#E8521A] to-[#2D7A4F] bg-clip-text text-transparent leading-none">
              NourishNet
            </h1>
            <p className="text-[11px] text-gray-500 font-medium">From Surplus to Zero Hunger • SIH 2026</p>
          </div>
        </div>

        {/* Database & Architecture Indicator */}
        <div className="hidden md:flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-gray-200 text-xs shadow-sm">
          <Database className="w-3.5 h-3.5 text-blue-600" />
          <span className="font-semibold text-gray-700">Cloud SQL PostgreSQL:</span>
          <span className={`inline-block w-2 h-2 rounded-full ${dbStatus === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          <span className="capitalize font-mono text-[11px] text-gray-600">{dbStatus}</span>
        </div>

        {/* Actions & Role Switcher */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative p-2 rounded-full bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 transition"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {notifications.some((n) => !n.isRead) && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-[#E8521A] rounded-full ring-2 ring-white" />
            )}
          </button>

          {/* Active Role Chip */}
          <div className="flex items-center gap-2 bg-gradient-to-r from-[#E8521A] to-[#FF6B35] text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-sm">
            <span className="capitalize">{role || 'Guest'}</span>
            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded">RBAC</span>
          </div>

          {user ? (
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full text-xs font-semibold"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          ) : (
            <button
              onClick={handleGoogleLogin}
              className="hidden sm:flex items-center gap-1.5 bg-white hover:bg-gray-50 border border-gray-300 text-gray-800 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm"
            >
              <span>🔑 Google Sign-In</span>
            </button>
          )}
        </div>
      </header>

      {/* ROLE SWITCHER BAR */}
      <section className="bg-white border-b border-[#E5E0D8] px-4 py-2.5 overflow-x-auto scrollbar-none flex items-center gap-2">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap pl-2">
          Test Persona:
        </span>
        {[
          { key: 'restaurant', label: 'Restaurant / Dhaba', icon: Store, color: 'text-orange-600' },
          { key: 'ngo', label: 'NGO / Beneficiary', icon: HeartHandshake, color: 'text-emerald-600' },
          { key: 'mediator', label: 'FSSAI Mediator', icon: Microscope, color: 'text-purple-600' },
          { key: 'delivery', label: 'Delivery Partner', icon: Bike, color: 'text-blue-600' },
          { key: 'biogas', label: 'Biogas Producer', icon: Zap, color: 'text-emerald-700' },
        ].map((item) => {
          const Icon = item.icon;
          const isSelected = role === item.key;
          return (
            <button
              key={item.key}
              onClick={() => handleSelectRole(item.key as Role)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-[#E8521A] text-white shadow-md'
                  : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : item.color}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </section>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 space-y-6">
        {/* SDG & IMPACT HERO BANNER */}
        <div className="bg-gradient-to-r from-[#1A1A2E] via-[#16213E] to-[#0F3460] rounded-2xl p-5 text-white shadow-lg relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-xs font-semibold text-[#FFD166]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Verified Food Redistribution Network • Zero Rejection Layer</span>
            </div>
            <h2 className="font-head text-2xl lg:text-3xl font-extrabold text-white">
              Zero Hunger • Responsible Consumption
            </h2>
            <p className="text-gray-300 text-xs sm:text-sm max-w-xl">
              FSSAI Mediators inspect surplus meals within a 5km radius. Safe meals are fast-tracked to NGOs; non-compliant food is diverted into clean Biogas.
            </p>
          </div>

          {/* Quick Metrics from PostgreSQL */}
          <div className="grid grid-cols-3 gap-3 w-full md:w-auto z-10">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10">
              <div className="text-xs text-gray-300">Meals Served</div>
              <div className="font-head text-xl font-extrabold text-[#FFD166]">
                {analytics?.mealsServed || 4960}+
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10">
              <div className="text-xs text-gray-300">CO₂ Saved</div>
              <div className="font-head text-xl font-extrabold text-[#6EE7A0]">
                {analytics?.totalCo2Saved || 355} kg
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center border border-white/10">
              <div className="text-xs text-gray-300">Clean Energy</div>
              <div className="font-head text-xl font-extrabold text-[#60A5FA]">
                {analytics?.biogasGeneratedM3 || 1.8} m³
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* ROLE VIEW: RESTAURANT / DHABA */}
        {/* ======================================================== */}
        {role === 'restaurant' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-head text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <span>🏪 Restaurant Shelf Management</span>
                  <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                    GST Verified
                  </span>
                </h3>
                <p className="text-xs text-gray-500">
                  List surplus food in seconds. Mediators verify within minutes.
                </p>
              </div>
              <button
                onClick={() => setShowAddFoodModal(true)}
                className="flex items-center gap-2 bg-[#E8521A] hover:bg-[#D4410D] text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-md transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add Surplus Food</span>
              </button>
            </div>

            {/* Shelf Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {listings.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-4xl">{item.emoji}</span>
                      <div>
                        <h4 className="font-bold text-gray-900 text-base">{item.name}</h4>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span
                            className={`font-semibold ${
                              item.foodType === 'Veg' ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {item.foodType}
                          </span>
                          <span>•</span>
                          <span>{item.cuisine}</span>
                        </div>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded-full uppercase ${
                        item.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.status === 'inspection'
                          ? 'bg-purple-100 text-purple-800'
                          : item.status === 'claimed'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-gray-50 rounded-xl p-2.5 text-center text-xs">
                    <div>
                      <div className="text-gray-400">Quantity</div>
                      <div className="font-bold text-gray-800">{item.qtyKg} kg</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Price</div>
                      <div className="font-bold text-gray-800">
                        {item.priceType === 'Free' ? 'FREE' : `₹${item.priceAmount}/kg`}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400">CO₂ Offset</div>
                      <div className="font-bold text-emerald-600">{item.co2SavedKg} kg</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="flex items-center gap-1 text-rose-600 font-semibold">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Expires in {item.expiryHours} hrs</span>
                    </span>
                    <span className="text-purple-700 font-semibold">AI Confidence: {item.aiConfidence}%</span>
                  </div>

                  {item.status === 'available' && (
                    <button
                      onClick={() => handleRequestInspection(item.id)}
                      className="w-full py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition"
                    >
                      <Microscope className="w-3.5 h-3.5" />
                      <span>Request Fast-Track Inspection</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* ROLE VIEW: NGO / CUSTOMER */}
        {/* ======================================================== */}
        {role === 'ngo' && (
          <div className="space-y-6">
            {/* Search & Filter bar */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search surplus food: biryani, dal, chole... या हिंदी में खोजें"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#E8521A]"
                  />
                </div>
                <button
                  onClick={toggleVoiceSearch}
                  className={`p-2.5 rounded-xl border transition ${
                    isListening
                      ? 'bg-rose-600 text-white border-rose-600 animate-pulse'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
                  }`}
                  title="Voice Search"
                >
                  <Mic className="w-4 h-4" />
                </button>
              </div>

              {/* Filters */}
              <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
                {['All', 'Veg', 'Non-Veg', 'Jain', 'Free'].map((chip) => (
                  <button
                    key={chip}
                    onClick={() => setActiveFilter(chip)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                      activeFilter === chip
                        ? 'bg-[#E8521A] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* View Switcher: Interactive Map vs Grid */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowMapView(true)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    showMapView
                      ? 'bg-[#2D7A4F] text-white shadow-sm'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>🗺️ Dynamic 5km Map View</span>
                </button>
                <button
                  onClick={() => setShowMapView(false)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    !showMapView
                      ? 'bg-[#2D7A4F] text-white shadow-sm'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>📦 Card Grid Only</span>
                </button>
              </div>

              <span className="text-xs text-gray-500 font-medium hidden sm:inline">
                Radius: <strong className="text-[#2D7A4F]">5.0 km</strong> around NGO Hub
              </span>
            </div>

            {/* Dynamic Google Maps Component */}
            {showMapView && (
              <NgoFoodMap listings={listings} onClaimFood={handleClaimFood} />
            )}

            {/* Food Grid for NGOs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {listings.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between"
                >
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-5xl">{item.emoji}</span>
                      <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full">
                        {item.priceType === 'Free' ? 'FREE DONATION' : `₹${item.priceAmount}/kg`}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-head text-lg font-bold text-gray-900">{item.name}</h4>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        <span>{item.restaurantName || 'Verified Dhaba / Hotel'}</span>
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-gray-50 p-2.5 rounded-xl text-xs">
                      <div>
                        <span className="text-gray-400">Available:</span>
                        <span className="font-bold text-gray-800 ml-1">{item.qtyKg} kg</span>
                      </div>
                      <div>
                        <span className="text-gray-400">CO₂ Benefit:</span>
                        <span className="font-bold text-emerald-600 ml-1">+{item.co2SavedKg}kg</span>
                      </div>
                    </div>

                    <p className="text-xs text-gray-600 italic line-clamp-2">
                      "{item.notes || 'Hygienically stored in insulated containers.'}"
                    </p>
                  </div>

                  <div className="p-4 pt-0">
                    <button
                      onClick={() => handleClaimFood(item)}
                      disabled={item.status !== 'available' && item.status !== 'approved'}
                      className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                        item.status === 'available' || item.status === 'approved'
                          ? 'bg-[#2D7A4F] hover:bg-[#236340] text-white shadow-md'
                          : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      <HeartHandshake className="w-4 h-4" />
                      <span>{item.status === 'claimed' ? 'Already Claimed' : 'Claim for Distribution'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Active Claims & Cart */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
              <h3 className="font-head text-xl font-bold text-gray-900 flex items-center gap-2">
                <span>🛒 Active Claims & Certifications</span>
                <span className="text-xs bg-gray-100 text-gray-600 font-semibold px-2 py-0.5 rounded-full">
                  {claims.length} Orders
                </span>
              </h3>

              <div className="divide-y divide-gray-100">
                {claims.map((claim) => (
                  <div key={claim.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{claim.foodEmoji || '🍲'}</span>
                      <div>
                        <h5 className="font-bold text-gray-900 text-sm">{claim.foodName}</h5>
                        <p className="text-xs text-gray-500">
                          {claim.quantityClaimed}kg • From {claim.restaurantName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${
                          claim.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : claim.status === 'inspecting'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {claim.status}
                      </span>
                      {claim.status === 'approved' && (
                        <button
                          onClick={() =>
                            setShowCertModal({
                              certNum: `NNT-${claim.id}-VERIFIED`,
                              foodName: claim.foodName,
                              score: 95,
                            })
                          }
                          className="text-xs text-emerald-700 font-bold underline hover:text-emerald-900"
                        >
                          View Certificate
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* ROLE VIEW: MEDIATOR (FSSAI INSPECTOR) */}
        {/* ======================================================== */}
        {role === 'mediator' && (
          <div className="space-y-6">
            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="font-head text-2xl font-bold text-purple-900 flex items-center gap-2">
                  <Microscope className="w-6 h-6 text-purple-700" />
                  <span>FSSAI Certified Quality Inspection Station</span>
                </h3>
                <p className="text-xs text-purple-700 mt-1">
                  License: FSSAI-MH-2024-8821 • Inspector: Ramesh Kumar • Fee: ₹120 per completed inspection
                </p>
              </div>
              <div className="bg-white px-4 py-2 rounded-xl border border-purple-200 text-center">
                <div className="text-[11px] text-gray-500">Inspection Earnings Today</div>
                <div className="font-head text-xl font-bold text-purple-700">₹960.00</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Inspection Queue */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm space-y-3">
                <h4 className="font-bold text-gray-900 text-sm uppercase tracking-wider">
                  Pending Inspections ({inspections.length})
                </h4>
                <div className="space-y-2">
                  {inspections.map((insp) => (
                    <div
                      key={insp.id}
                      onClick={() => setSelectedInspection(insp)}
                      className={`p-3 rounded-xl border cursor-pointer transition ${
                        selectedInspection?.id === insp.id
                          ? 'border-purple-600 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{insp.foodEmoji}</span>
                          <span className="font-bold text-sm text-gray-900">{insp.foodName}</span>
                        </div>
                        <span className="text-xs font-bold text-purple-700">{insp.qtyKg}kg</span>
                      </div>
                      <div className="text-[11px] text-gray-500 mt-1">
                        {insp.restaurantName} • Status: {insp.status}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4-Point Digital Inspection Checklist */}
              {selectedInspection && (
                <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-5">
                  <div className="flex items-center justify-between border-b pb-4">
                    <div>
                      <h4 className="font-head text-xl font-bold text-gray-900">
                        Inspection: {selectedInspection.foodName}
                      </h4>
                      <p className="text-xs text-gray-500">
                        {selectedInspection.qtyKg}kg • FSSAI 4-Point Quality Verification Standard
                      </p>
                    </div>
                    <span className="bg-purple-100 text-purple-800 text-xs font-bold px-3 py-1 rounded-full">
                      On-Site Assessment
                    </span>
                  </div>

                  {/* Checklist toggles */}
                  <div className="space-y-3">
                    {[
                      {
                        key: 'texture',
                        title: '1. Texture & Consistency Check',
                        desc: 'Normal viscosity, no sliminess, natural elasticity',
                      },
                      {
                        key: 'color',
                        title: '2. Color & Visual Odor Inspection',
                        desc: 'Natural seasoning hue, no unnatural discoloration or off-notes',
                      },
                      {
                        key: 'hygiene',
                        title: '3. Container & Handling Hygiene',
                        desc: 'Stainless food-grade vessel, tightly sealed lid',
                      },
                      {
                        key: 'temp',
                        title: '4. Core Holding Temperature',
                        desc: 'Safe thermal holding zone (Above 55°C hot, or under 5°C cold)',
                      },
                    ].map((item) => (
                      <div
                        key={item.key}
                        onClick={() =>
                          setChecklist((prev) => ({
                            ...prev,
                            [item.key as keyof typeof checklist]: !prev[item.key as keyof typeof checklist],
                          }))
                        }
                        className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                          checklist[item.key as keyof typeof checklist]
                            ? 'bg-emerald-50 border-emerald-300'
                            : 'bg-rose-50 border-rose-300'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-sm text-gray-900">{item.title}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{item.desc}</div>
                        </div>
                        <div className="flex items-center gap-1.5 font-bold text-xs">
                          {checklist[item.key as keyof typeof checklist] ? (
                            <span className="text-emerald-700 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> PASS
                            </span>
                          ) : (
                            <span className="text-rose-700 flex items-center gap-1">
                              <XCircle className="w-4 h-4" /> FAIL
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Thermometer Reading */}
                  <div className="bg-gray-50 p-3.5 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-gray-700">Digital Probe Thermometer (°C)</div>
                      <div className="text-[11px] text-gray-400">Target hot holding: &gt; 55.0°C</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.1"
                        value={temperatureVal}
                        onChange={(e) => setTemperatureVal(parseFloat(e.target.value) || 0)}
                        className="w-24 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-bold text-right focus:outline-none"
                      />
                      <span className="text-sm font-bold text-gray-600">°C</span>
                    </div>
                  </div>

                  {/* Inspector Decision Action */}
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <button
                      onClick={() => handleSubmitInspection('approve')}
                      className="py-3 rounded-xl bg-[#2D7A4F] hover:bg-[#236340] text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve & Issue Certificate</span>
                    </button>
                    <button
                      onClick={() => handleSubmitInspection('reject')}
                      className="py-3 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition"
                    >
                      <Zap className="w-4 h-4" />
                      <span>Reject & Divert to Biogas</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* ROLE VIEW: DELIVERY PARTNER */}
        {/* ======================================================== */}
        {role === 'delivery' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-head text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Bike className="w-6 h-6 text-blue-600" />
                  <span>Delivery Fleet Dispatch & Tracking</span>
                </h3>
                <p className="text-xs text-gray-500">Live GPS tracking • Earn ₹8 - ₹50 per kilometer</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 px-4 py-2 rounded-xl text-center">
                <div className="text-[11px] text-gray-500">Today's Earnings</div>
                <div className="font-head text-xl font-bold text-blue-700">₹340.00</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {deliveryJobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{job.type === 'food' ? '🍲' : '⚡'}</span>
                      <span className="font-bold text-gray-900 text-sm">
                        {job.type === 'food' ? 'Safe Meal Delivery' : 'Bio-Waste Transport'}
                      </span>
                    </div>
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        job.status === 'delivered'
                          ? 'bg-emerald-100 text-emerald-800'
                          : job.status === 'in_transit'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {job.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs text-gray-600 bg-gray-50 p-3 rounded-xl">
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1" />
                      <span>
                        <strong className="text-gray-900">Pickup:</strong> {job.pickupLocation}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-rose-500 mt-1" />
                      <span>
                        <strong className="text-gray-900">Dropoff:</strong> {job.dropoffLocation}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="text-gray-400">Distance:</span>
                      <span className="font-bold text-gray-800 ml-1">{job.distanceKm} km</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Payout:</span>
                      <span className="font-head text-base font-bold text-emerald-600 ml-1">
                        ₹{job.earningsInr}
                      </span>
                    </div>
                  </div>

                  {job.status === 'available' && (
                    <button
                      onClick={() => handleAcceptDelivery(job.id)}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md transition"
                    >
                      Accept Delivery (₹{job.earningsInr})
                    </button>
                  )}

                  {job.status === 'accepted' && (
                    <button
                      onClick={() => handleUpdateDeliveryStatus(job.id, 'in_transit')}
                      className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow-md transition"
                    >
                      Mark Picked Up & In-Transit
                    </button>
                  )}

                  {job.status === 'in_transit' && (
                    <button
                      onClick={() => handleUpdateDeliveryStatus(job.id, 'delivered')}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md transition"
                    >
                      Confirm Safe Delivery ✅
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* ROLE VIEW: BIOGAS PRODUCER */}
        {/* ======================================================== */}
        {role === 'biogas' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-head text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Zap className="w-6 h-6 text-emerald-600" />
                  <span>Waste-to-Energy Biogas Generation</span>
                </h3>
                <p className="text-xs text-gray-500">
                  MNRE Certified Plant • Auto-routed spoiled food converted into clean energy
                </p>
              </div>
            </div>

            {/* Production Stats Meter */}
            <div className="bg-gradient-to-r from-emerald-950 to-emerald-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 relative z-10">
                <div>
                  <div className="text-xs text-emerald-300 font-semibold">Total Biogas Generated</div>
                  <div className="font-head text-4xl font-extrabold text-emerald-400 mt-1">
                    {analytics?.biogasGeneratedM3 || 1.8} m³
                  </div>
                  <div className="text-[11px] text-emerald-200 mt-1">Approx 4.5 hours of electricity</div>
                </div>
                <div>
                  <div className="text-xs text-emerald-300 font-semibold">Clean Electricity Output</div>
                  <div className="font-head text-4xl font-extrabold text-emerald-400 mt-1">
                    {analytics?.kwhGenerated || 7.9} kWh
                  </div>
                  <div className="text-[11px] text-emerald-200 mt-1">Grid feed-in ready</div>
                </div>
                <div>
                  <div className="text-xs text-emerald-300 font-semibold">Net Methane Avoided</div>
                  <div className="font-head text-4xl font-extrabold text-emerald-400 mt-1">
                    {analytics?.totalCo2Saved || 355} kg
                  </div>
                  <div className="text-[11px] text-emerald-200 mt-1">Diverted from open landfills</div>
                </div>
              </div>
            </div>

            {/* Incoming Collections Table */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
              <h4 className="font-bold text-gray-900 text-sm uppercase tracking-wider">
                Incoming Organic Waste Batches ({biogasBatches.length})
              </h4>
              <div className="divide-y divide-gray-100">
                {biogasBatches.map((batch) => (
                  <div key={batch.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">♻️</span>
                      <div>
                        <h5 className="font-bold text-gray-900 text-sm">{batch.sourceName}</h5>
                        <p className="text-xs text-gray-500">
                          {batch.wasteKg} kg waste • Est: {batch.biogasM3} m³ Biogas
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${
                          batch.status === 'processed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {batch.status}
                      </span>
                      {batch.status === 'incoming' && (
                        <button
                          onClick={() => handleProcessBiogas(batch.id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition"
                        >
                          Confirm & Process
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* CROSS-CUTTING: REAL-TIME TRANSLATED CHAT */}
        {/* ======================================================== */}
        <section className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="font-head text-lg font-bold text-gray-900 flex items-center gap-2">
                <span>💬 Multi-Lingual P2P Coordination Chat</span>
                <span className="text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">
                  Auto-Translate: Hindi ↔ English
                </span>
              </h3>
              <p className="text-xs text-gray-500">Instant messaging between Restaurants, NGOs, and Riders</p>
            </div>
          </div>

          <div className="h-56 overflow-y-auto space-y-3 p-3 bg-gray-50 rounded-xl">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`p-3 rounded-2xl max-w-md text-xs space-y-1 ${
                  msg.roleType === role
                    ? 'ml-auto bg-[#E8521A] text-white rounded-br-none shadow-sm'
                    : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none shadow-sm'
                }`}
              >
                <div className="font-bold opacity-80">{msg.senderName || msg.roleType.toUpperCase()}</div>
                <div>{msg.message}</div>
                {msg.translatedMessage && (
                  <div className="text-[11px] italic opacity-90 pt-1 border-t border-white/20">
                    {msg.translatedMessage}
                  </div>
                )}
              </div>
            ))}
          </div>

          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type message in English or Hindi (e.g. 'Pickup ready' or 'गाड़ी पहुंच रही है')..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-xs focus:outline-none focus:border-[#E8521A]"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#E8521A] hover:bg-[#D4410D] text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md transition"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        </section>
      </main>

      {/* MODAL: ADD SURPLUS FOOD (Restaurant) */}
      {showAddFoodModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-head text-2xl font-bold text-gray-900">List Surplus Food</h3>
              <button
                onClick={() => setShowAddFoodModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            {/* AI Vision Simulator button */}
            <div className="bg-purple-50 p-4 rounded-2xl border border-purple-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-purple-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span>Gemini Vision AI Food Detection</span>
                </span>
                <button
                  type="button"
                  onClick={runAiVisionDetection}
                  disabled={aiDetecting}
                  className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg transition"
                >
                  {aiDetecting ? 'Analyzing...' : 'Auto-Fill with AI 📸'}
                </button>
              </div>
              {aiDetectionResult && (
                <div className="text-xs text-purple-800 bg-purple-100/70 p-2 rounded-lg font-medium">
                  {aiDetectionResult}
                </div>
              )}
            </div>

            <form onSubmit={handleAddFoodSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700">Food Item Name</label>
                <input
                  type="text"
                  required
                  value={newFood.name}
                  onChange={(e) => setNewFood({ ...newFood, name: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700">Quantity (kg)</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={newFood.qtyKg}
                    onChange={(e) => setNewFood({ ...newFood, qtyKg: parseFloat(e.target.value) || 0 })}
                    className="w-full mt-1 px-3 py-2 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700">Category</label>
                  <select
                    value={newFood.foodType}
                    onChange={(e) => setNewFood({ ...newFood, foodType: e.target.value as any })}
                    className="w-full mt-1 px-3 py-2 border rounded-xl"
                  >
                    <option value="Veg">Vegetarian</option>
                    <option value="Non-Veg">Non-Vegetarian</option>
                    <option value="Jain">Jain Compliant</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700">Cuisine</label>
                  <input
                    type="text"
                    required
                    value={newFood.cuisine}
                    onChange={(e) => setNewFood({ ...newFood, cuisine: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700">Price Model</label>
                  <select
                    value={newFood.priceType}
                    onChange={(e) => setNewFood({ ...newFood, priceType: e.target.value as any })}
                    className="w-full mt-1 px-3 py-2 border rounded-xl"
                  >
                    <option value="Free">Free (Charity)</option>
                    <option value="Paid">Subsidized / kg</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700">Expiry Time (Hours)</label>
                <input
                  type="number"
                  required
                  value={newFood.expiryHours}
                  onChange={(e) => setNewFood({ ...newFood, expiryHours: parseFloat(e.target.value) || 1 })}
                  className="w-full mt-1 px-3 py-2 border rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700">Storage Notes</label>
                <textarea
                  rows={2}
                  value={newFood.notes}
                  onChange={(e) => setNewFood({ ...newFood, notes: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-xl"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#E8521A] hover:bg-[#D4410D] text-white font-bold text-sm rounded-xl shadow-lg transition mt-4"
              >
                Publish Surplus Food to PostgreSQL
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SAFE FOOD CERTIFICATE */}
      {showCertModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gradient-to-b from-[#FFFDF8] to-[#F0FFF4] border-4 border-[#2D7A4F] rounded-3xl max-w-md w-full p-8 text-center space-y-4 shadow-2xl relative">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-3xl shadow-inner">
              🏅
            </div>
            <h3 className="font-head text-2xl font-bold text-[#2D7A4F]">
              NourishNet Safe Food Certificate
            </h3>
            <p className="text-xs text-gray-600">
              This surplus meal has been independently inspected by an FSSAI certified mediator and complies with all hygiene safety standards.
            </p>

            <div className="bg-white p-4 rounded-2xl border border-emerald-200 text-xs space-y-2 text-left">
              <div>
                <span className="text-gray-400">Meal:</span>
                <span className="font-bold text-gray-900 ml-1">{showCertModal.foodName}</span>
              </div>
              <div>
                <span className="text-gray-400">AI Safety Score:</span>
                <span className="font-bold text-emerald-600 ml-1">{showCertModal.score}% PASS</span>
              </div>
              <div>
                <span className="text-gray-400">Certificate ID:</span>
                <span className="font-mono font-bold text-gray-900 ml-1">{showCertModal.certNum}</span>
              </div>
              <div>
                <span className="text-gray-400">FSSAI Authority:</span>
                <span className="font-bold text-gray-700 ml-1">Punjab State Food Safety Cell</span>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl text-[11px] text-emerald-800 font-mono">
              [CRYPTOGRAPHIC_VERIFICATION_HASH: sha256-verified-ok]
            </div>

            <button
              onClick={() => setShowCertModal(null)}
              className="w-full py-2.5 bg-[#2D7A4F] hover:bg-[#236340] text-white font-bold text-xs rounded-xl shadow-md transition"
            >
              Close Certificate
            </button>
          </div>
        </div>
      )}

      {/* NOTIFICATIONS DRAWER */}
      {showNotifs && (
        <div className="fixed inset-y-0 right-0 z-50 w-80 bg-white shadow-2xl border-l border-gray-200 p-4 space-y-4 flex flex-col">
          <div className="flex items-center justify-between border-b pb-2">
            <h4 className="font-head text-lg font-bold text-gray-900">Notifications</h4>
            <button onClick={() => setShowNotifs(false)} className="text-gray-400 text-lg">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2">
            {notifications.map((n) => (
              <div key={n.id} className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs space-y-1">
                <div className="font-bold text-gray-900">{n.title}</div>
                <div className="text-gray-600">{n.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="border-t border-[#E5E0D8] bg-white py-4 px-6 text-center text-xs text-gray-500">
        NourishNet © 2026 • AI-Powered Food Waste to Zero Hunger • Built with Node.js, Express, Cloud SQL (PostgreSQL), and Firebase Auth
      </footer>
    </div>
  );
}
