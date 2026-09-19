import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  Video,
  QrCode,
  Plug,
  Snowflake,
  Info,
  ArrowRight,
  ShieldCheck,
  Headphones,
  Ruler,
  Backpack,
  Package,
  Home,
  Check,
  ChevronDown,
  Navigation,
  Star,
  CheckCircle,
  Timer,
  LockOpen,
  Lock,
  Key,
  BadgeCheck
} from 'lucide-react';
import { MOCK_STATIONS } from '../api/stationService';

interface StationBookingPageProps {
  onNavigate: (page: string, props?: any) => void;
  stationId?: string;
}

const StationBookingPage: React.FC<StationBookingPageProps> = ({ onNavigate, stationId }) => {
  const currentStation = MOCK_STATIONS.find(s => s.id === stationId) || {
    id: '3',
    name: 'SmartLocker Phố Đi Bộ Nguyễn Huệ',
    address: '89 Nguyễn Huệ, Phường Bến Nghé, Q.1, TP.HCM',
    latitude: 10.7752,
    longitude: 106.7031,
    status: 'ACTIVE' as const,
    opensAt: '08:00',
    closesAt: '22:30',
    totalS: 10, totalM: 10, totalL: 5,
    availableS: 3, availableM: 7, availableL: 2,
    contactPhone: '028 3822 1234',
  };

  const [selectedSize, setSelectedSize] = useState<'S' | 'M' | 'L' | null>('M');
  const [selectedDuration, setSelectedDuration] = useState<number>(3);
  const [storageDate, setStorageDate] = useState<string>('Hôm nay, ' + new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }));
  const [dropOffTime, setDropOffTime] = useState<string>('14:00');

  const basePrices = {
    S: 20000,
    M: 35000,
    L: 50000
  };

  const getPrice = (size: 'S' | 'M' | 'L' | null, duration: number) => {
    if (!size) return 0;
    return (basePrices[size] * duration) / 3;
  };

  const currentPrice = getPrice(selectedSize, selectedDuration);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  return (
    <div className="bg-[#F8FAFC] min-h-screen pb-20">
      {/* 1. Breadcrumb Strip */}
      <div className="bg-white border-b border-outline-variant/30 py-3 px-6 sm:px-10">
        <div className="max-w-7xl mx-auto flex items-center text-sm text-secondary">
          <button onClick={() => onNavigate('home')} className="flex items-center hover:text-primary transition-colors">
            <Home className="w-4 h-4 mr-1" />
            Home
          </button>
          <span className="mx-2">/</span>
          <button onClick={() => onNavigate('map')} className="hover:text-primary transition-colors">
            Stations
          </button>
          <span className="mx-2">/</span>
          <span className="font-medium text-on-surface">{currentStation.name}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* 2. Station Hero Card */}
        <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/30 overflow-hidden mb-8">
          <div className="grid grid-cols-1 md:grid-cols-12">
            {/* Left: Station Photo */}
            <div className="md:col-span-4 relative h-48 md:h-full">
              <img 
                src="https://images.unsplash.com/photo-1542296332-2e4473faf563?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
                alt="Station Location" 
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md text-white px-3 py-1.5 rounded-lg flex items-center text-xs font-medium">
                <Video className="w-4 h-4 mr-1.5 text-green-400" />
                24-Camera Guarded Vault
              </div>
            </div>
            
            {/* Right: Station Details */}
            <div className="md:col-span-8 p-6 md:p-8 flex flex-col justify-center">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="bg-primary/10 text-primary text-xs font-bold px-2.5 py-1 rounded-md border border-primary/20">
                      HUB #{currentStation.id.padStart(2, '0')}
                    </span>
                    <span className="bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1 rounded-md flex items-center border border-green-200">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse"></div>
                      ACTIVE
                    </span>
                  </div>
                  <h1 className="text-2xl font-bold text-[#0F172A] mb-2">{currentStation.name}</h1>
                  <div className="flex items-center text-secondary text-sm">
                    <MapPin className="w-4 h-4 mr-1.5 shrink-0" />
                    <span>{currentStation.address}</span>
                  </div>
                </div>
                <div className="hidden sm:flex flex-col items-end">
                  <div className="flex items-center text-yellow-500 font-medium bg-yellow-50 px-2 py-1 rounded text-sm mb-1">
                    <Star className="w-4 h-4 mr-1 fill-current" />
                    4.9
                  </div>
                  <span className="text-xs text-secondary">2.4k bookings</span>
                </div>
              </div>

              <div className="border-t border-outline-variant/30 my-4"></div>

              <div>
                <p className="text-xs font-medium text-secondary mb-3 uppercase tracking-wider">Amenities & Security Features</p>
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center bg-[#F1F5F9] text-[#475569] text-xs px-3 py-1.5 rounded-full border border-outline-variant/20">
                    <Video className="w-3.5 h-3.5 mr-1.5" /> CCTV 24/7
                  </div>
                  <div className="flex items-center bg-[#F1F5F9] text-[#475569] text-xs px-3 py-1.5 rounded-full border border-outline-variant/20">
                    <QrCode className="w-3.5 h-3.5 mr-1.5" /> QR Access
                  </div>
                  <div className="flex items-center bg-[#F1F5F9] text-[#475569] text-xs px-3 py-1.5 rounded-full border border-outline-variant/20">
                    <Plug className="w-3.5 h-3.5 mr-1.5" /> Power Sockets
                  </div>
                  <div className="flex items-center bg-[#F1F5F9] text-[#475569] text-xs px-3 py-1.5 rounded-full border border-outline-variant/20">
                    <Snowflake className="w-3.5 h-3.5 mr-1.5" /> Air-Conditioned
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column (8/12) */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Section A: Select Date & Storage Duration */}
            <section className="bg-surface-container-lowest p-6 sm:p-8 rounded-2xl shadow-sm border border-outline-variant/30">
              <div className="flex items-center mb-6">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold mr-3">1</div>
                <h2 className="text-xl font-bold text-[#0F172A]">Select Date & Duration</h2>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {/* Date Picker Box */}
                <div className="border border-outline-variant/50 rounded-xl p-4 hover:border-primary/50 cursor-pointer transition-colors bg-white">
                  <label className="text-xs font-medium text-secondary mb-1 block">Drop-off Date</label>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-[#0F172A] font-semibold">
                      <Calendar className="w-5 h-5 mr-2 text-primary" />
                      {storageDate}
                    </div>
                    <ChevronDown className="w-4 h-4 text-secondary" />
                  </div>
                </div>
                
                {/* Time Picker Box */}
                <div className="border border-outline-variant/50 rounded-xl p-4 hover:border-primary/50 cursor-pointer transition-colors bg-white">
                  <label className="text-xs font-medium text-secondary mb-1 block">Est. Drop-off Time</label>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-[#0F172A] font-semibold">
                      <Clock className="w-5 h-5 mr-2 text-primary" />
                      {dropOffTime}
                    </div>
                    <ChevronDown className="w-4 h-4 text-secondary" />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-[#0F172A] mb-3 block">Storage Duration</label>
                <div className="flex flex-wrap gap-3">
                  {[3, 6, 12, 24].map((duration) => (
                    <button
                      key={duration}
                      onClick={() => setSelectedDuration(duration)}
                      className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                        selectedDuration === duration
                          ? 'bg-primary text-white shadow-md shadow-primary/20 border border-primary'
                          : 'bg-white text-[#475569] border border-outline-variant/50 hover:border-primary/50 hover:bg-[#F8FAFC]'
                      }`}
                    >
                      {duration} Hours
                    </button>
                  ))}
                  <button className="px-5 py-2.5 rounded-full text-sm font-medium bg-white text-[#475569] border border-outline-variant/50 hover:border-primary/50 hover:bg-[#F8FAFC] flex items-center">
                    Custom <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </button>
                </div>
              </div>

              {/* Time window indicator banner */}
              <div className="mt-6 bg-[#EFF6FF] border border-blue-100 rounded-xl p-4 flex items-start">
                <Timer className="w-5 h-5 text-blue-600 mr-3 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-sm font-semibold text-blue-900">Your Booking Window</h4>
                  <p className="text-sm text-blue-800 mt-1">
                    Drop-off from <strong>14:00</strong> | Pick-up until <strong>{14 + selectedDuration > 24 ? (14 + selectedDuration - 24) + ':00 (Next Day)' : (14 + selectedDuration) + ':00 (Today)'}</strong>
                  </p>
                  <p className="text-xs text-blue-600 mt-1 flex items-center">
                    <Info className="w-3.5 h-3.5 mr-1" /> Overtime fees apply after designated pick-up time.
                  </p>
                </div>
              </div>
            </section>

            {/* Section B: Choose Compartment Size */}
            <section className="bg-surface-container-lowest p-6 sm:p-8 rounded-2xl shadow-sm border border-outline-variant/30">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
                <div className="flex items-center mb-2 sm:mb-0">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold mr-3">2</div>
                  <h2 className="text-xl font-bold text-[#0F172A]">Choose Compartment Size</h2>
                </div>
                <div className="flex items-center text-sm font-medium text-green-600 bg-green-50 px-3 py-1.5 rounded-lg border border-green-100">
                  <ShieldCheck className="w-4 h-4 mr-1.5" /> High Availability
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Small Size */}
                <div 
                  onClick={() => setSelectedSize('S')}
                  className={`relative rounded-xl border-2 transition-all cursor-pointer overflow-hidden flex flex-col ${
                    selectedSize === 'S' 
                      ? 'border-primary bg-[#F4F8FF] shadow-sm' 
                      : 'border-outline-variant/30 bg-white hover:border-primary/40'
                  }`}
                >
                  {selectedSize === 'S' && (
                    <div className="absolute top-0 right-0 bg-primary text-white px-2 py-1 rounded-bl-lg">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                  )}
                  <div className="p-5 flex-grow">
                    <div className="flex justify-between items-start mb-4">
                      <div className={`p-3 rounded-xl ${selectedSize === 'S' ? 'bg-primary/10 text-primary' : 'bg-[#F1F5F9] text-secondary'}`}>
                        <Backpack className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">4 left</span>
                    </div>
                    <h3 className="text-lg font-bold text-[#0F172A]">Small (S)</h3>
                    <div className="flex items-center text-xs text-secondary mt-1 mb-3">
                      <Ruler className="w-3.5 h-3.5 mr-1" /> 40 x 40 x 50 cm
                    </div>
                    <p className="text-sm text-[#475569] mb-4">Fits 1-2 standard backpacks, purses, or shopping bags.</p>
                  </div>
                  <div className={`p-4 border-t ${selectedSize === 'S' ? 'border-primary/20 bg-primary/5' : 'border-outline-variant/30 bg-[#F8FAFC]'}`}>
                    <div className="flex items-baseline justify-between">
                      <span className="text-lg font-bold text-primary">{formatCurrency(basePrices.S)}</span>
                      <span className="text-xs text-secondary font-medium">/ 3 hrs</span>
                    </div>
                    <button className={`w-full mt-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      selectedSize === 'S' ? 'bg-primary text-white' : 'bg-white border border-outline-variant hover:bg-gray-50 text-[#0F172A]'
                    }`}>
                      {selectedSize === 'S' ? 'Selected' : 'Select'}
                    </button>
                  </div>
                </div>

                {/* Medium Size */}
                <div 
                  onClick={() => setSelectedSize('M')}
                  className={`relative rounded-xl border-2 transition-all cursor-pointer overflow-hidden flex flex-col ${
                    selectedSize === 'M' 
                      ? 'border-primary bg-[#F4F8FF] shadow-sm' 
                      : 'border-outline-variant/30 bg-white hover:border-primary/40'
                  }`}
                >
                  {selectedSize === 'M' && (
                    <div className="absolute top-0 right-0 bg-primary text-white px-2 py-1 rounded-bl-lg">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                  )}
                  <div className="absolute top-0 left-0 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded-br-lg uppercase">
                    Most Popular
                  </div>
                  <div className="p-5 flex-grow mt-2">
                    <div className="flex justify-between items-start mb-4">
                      <div className={`p-3 rounded-xl ${selectedSize === 'M' ? 'bg-primary/10 text-primary' : 'bg-[#F1F5F9] text-secondary'}`}>
                        <Package className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded">2 left</span>
                    </div>
                    <h3 className="text-lg font-bold text-[#0F172A]">Medium (M)</h3>
                    <div className="flex items-center text-xs text-secondary mt-1 mb-3">
                      <Ruler className="w-3.5 h-3.5 mr-1" /> 60 x 40 x 50 cm
                    </div>
                    <p className="text-sm text-[#475569] mb-4">Fits 1 carry-on luggage and a laptop bag.</p>
                  </div>
                  <div className={`p-4 border-t ${selectedSize === 'M' ? 'border-primary/20 bg-primary/5' : 'border-outline-variant/30 bg-[#F8FAFC]'}`}>
                    <div className="flex items-baseline justify-between">
                      <span className="text-lg font-bold text-primary">{formatCurrency(basePrices.M)}</span>
                      <span className="text-xs text-secondary font-medium">/ 3 hrs</span>
                    </div>
                    <button className={`w-full mt-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      selectedSize === 'M' ? 'bg-primary text-white' : 'bg-white border border-outline-variant hover:bg-gray-50 text-[#0F172A]'
                    }`}>
                      {selectedSize === 'M' ? 'Selected' : 'Select'}
                    </button>
                  </div>
                </div>

                {/* Large Size - Disabled */}
                <div className="relative rounded-xl border-2 border-outline-variant/30 bg-[#F8FAFC] opacity-75 overflow-hidden flex flex-col cursor-not-allowed">
                  <div className="absolute inset-0 bg-white/40 z-10"></div>
                  <div className="p-5 flex-grow relative z-0">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 rounded-xl bg-gray-200 text-gray-500">
                        <Package className="w-6 h-6" /> {/* Using Package as fallback for luggage if not available in lucide-react */}
                      </div>
                      <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded">Full</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-500">Large (L)</h3>
                    <div className="flex items-center text-xs text-gray-400 mt-1 mb-3">
                      <Ruler className="w-3.5 h-3.5 mr-1" /> 90 x 60 x 50 cm
                    </div>
                    <p className="text-sm text-gray-500 mb-4">Fits full-size check-in suitcases and bulky items.</p>
                  </div>
                  <div className="p-4 border-t border-outline-variant/30 bg-gray-100 relative z-0">
                    <div className="flex items-baseline justify-between">
                      <span className="text-lg font-bold text-gray-400">{formatCurrency(basePrices.L)}</span>
                      <span className="text-xs text-gray-400 font-medium">/ 3 hrs</span>
                    </div>
                    <button disabled className="w-full mt-3 py-2 rounded-lg text-sm font-semibold bg-gray-200 text-gray-400 cursor-not-allowed">
                      Unavailable
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Section C: Locker Bank Schematic */}
            <section className="bg-surface-container-lowest p-6 sm:p-8 rounded-2xl shadow-sm border border-outline-variant/30">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold mr-3">3</div>
                  <h2 className="text-xl font-bold text-[#0F172A]">Locker Assignment</h2>
                </div>
              </div>
              
              <div className="bg-[#1E293B] rounded-xl p-6 sm:p-8 overflow-x-auto">
                <div className="min-w-[500px]">
                  <div className="flex justify-center mb-6">
                    <div className="bg-[#334155] px-4 py-1 rounded-full text-xs text-slate-300 font-medium flex items-center">
                      <Navigation className="w-3 h-3 mr-1.5 rotate-180" /> Front Entry
                    </div>
                  </div>
                  
                  {/* Schematic Grid */}
                  <div className="grid grid-cols-4 gap-3 bg-[#0F172A] p-4 rounded-xl border border-slate-700">
                    {/* Row 1 */}
                    <div className="bg-green-500/20 border border-green-500/50 rounded-md h-12 flex items-center justify-center text-green-400 text-xs font-bold">S1</div>
                    <div className="bg-slate-700/50 border border-slate-600 rounded-md h-12 flex items-center justify-center text-slate-500 text-xs">S2</div>
                    <div className="bg-slate-700/50 border border-slate-600 rounded-md h-12 flex items-center justify-center text-slate-500 text-xs">S3</div>
                    <div className="bg-green-500/20 border border-green-500/50 rounded-md h-12 flex items-center justify-center text-green-400 text-xs font-bold">S4</div>
                    
                    {/* Row 2 */}
                    <div className="bg-green-500/20 border border-green-500/50 rounded-md h-16 flex items-center justify-center text-green-400 text-xs font-bold">M1</div>
                    <div className="bg-slate-700/50 border border-slate-600 rounded-md h-16 flex items-center justify-center text-slate-500 text-xs">M2</div>
                    <div className={`rounded-md h-16 flex items-center justify-center text-xs font-bold transition-all ${selectedSize === 'M' ? 'bg-primary border-2 border-white text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]' : 'bg-green-500/20 border border-green-500/50 text-green-400'}`}>
                      M3
                    </div>
                    <div className="bg-slate-700/50 border border-slate-600 rounded-md h-16 flex items-center justify-center text-slate-500 text-xs">M4</div>
                    
                    {/* Row 3 */}
                    <div className="bg-slate-700/50 border border-slate-600 rounded-md h-24 flex items-center justify-center text-slate-500 text-xs">L1</div>
                    <div className="bg-slate-700/50 border border-slate-600 rounded-md h-24 flex items-center justify-center text-slate-500 text-xs">L2</div>
                    <div className="bg-slate-700/50 border border-slate-600 rounded-md h-24 flex items-center justify-center text-slate-500 text-xs">L3</div>
                    <div className="bg-slate-700/50 border border-slate-600 rounded-md h-24 flex items-center justify-center text-slate-500 text-xs">L4</div>
                  </div>

                  {/* Legend */}
                  <div className="flex items-center justify-center space-x-6 mt-6">
                    <div className="flex items-center text-xs text-slate-300">
                      <div className="w-3 h-3 bg-primary border border-white rounded-sm mr-2 shadow-[0_0_8px_rgba(37,99,235,0.8)]"></div>
                      Your Assignment
                    </div>
                    <div className="flex items-center text-xs text-slate-300">
                      <div className="w-3 h-3 bg-green-500/20 border border-green-500/50 rounded-sm mr-2"></div>
                      Available
                    </div>
                    <div className="flex items-center text-xs text-slate-300">
                      <div className="w-3 h-3 bg-slate-700/50 border border-slate-600 rounded-sm mr-2"></div>
                      Occupied/Full
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-sm text-secondary mt-4 flex items-start">
                <Info className="w-4 h-4 mr-1.5 mt-0.5 shrink-0 text-primary" />
                <span>The system auto-assigns the best available compartment to minimize bending or reaching. Your precise compartment number will be provided upon payment.</span>
              </p>
            </section>
          </div>

          {/* Right Column (4/12) - Sticky */}
          <div className="lg:col-span-4">
            <div className="sticky top-6">
              
              {/* Booking Summary Card */}
              <div className="bg-surface-container-lowest rounded-2xl shadow-lg shadow-blue-900/5 border border-primary/20 overflow-hidden mb-6">
                <div className="bg-primary p-4 sm:p-6 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                  <h3 className="text-xl font-bold mb-1 relative z-10">Booking Summary</h3>
                  <p className="text-primary-100 text-sm relative z-10">Review your storage details</p>
                </div>
                
                <div className="p-4 sm:p-6 space-y-4">
                  {/* Line Items */}
                  <div className="flex justify-between items-start pb-4 border-b border-outline-variant/30">
                    <div>
                      <p className="text-xs text-secondary mb-1">Station</p>
                      <p className="text-sm font-semibold text-[#0F172A]">{currentStation.name}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-start pb-4 border-b border-outline-variant/30">
                    <div>
                      <p className="text-xs text-secondary mb-1">Assigned Unit</p>
                      <p className="text-sm font-semibold text-[#0F172A]">{selectedSize === 'S' ? 'Small Compartment' : selectedSize === 'M' ? 'Medium Compartment' : 'Large Compartment'}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-start pb-4 border-b border-outline-variant/30">
                    <div>
                      <p className="text-xs text-secondary mb-1">Time Window</p>
                      <p className="text-sm font-semibold text-[#0F172A]">{storageDate}</p>
                      <p className="text-xs text-[#475569] mt-0.5">14:00 - {14 + selectedDuration > 24 ? (14 + selectedDuration - 24) + ':00 (+1)' : (14 + selectedDuration) + ':00'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-secondary mb-1">Duration</p>
                      <p className="text-sm font-bold text-primary">{selectedDuration} Hours</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <p className="text-sm text-secondary">Base Rate</p>
                    <p className="text-sm font-medium text-[#0F172A]">{formatCurrency(currentPrice)}</p>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-secondary flex items-center">
                      <ShieldCheck className="w-3.5 h-3.5 mr-1 text-green-600" /> Protection Seal
                    </p>
                    <p className="text-sm font-medium text-green-600">Included</p>
                  </div>

                  <div className="flex justify-between items-center">
                    <p className="text-sm text-secondary flex items-center">
                      <Key className="w-3.5 h-3.5 mr-1 text-blue-600" /> SMS PIN Code
                    </p>
                    <p className="text-sm font-medium text-green-600">Included</p>
                  </div>

                  <div className="bg-[#F8FAFC] p-4 rounded-xl mt-6 border border-outline-variant/30">
                    <div className="flex justify-between items-end mb-1">
                      <p className="text-sm font-semibold text-[#0F172A]">Total Amount</p>
                      <p className="text-2xl font-bold text-primary">{formatCurrency(currentPrice)}</p>
                    </div>
                    <p className="text-xs text-secondary text-right">Includes VAT & taxes</p>
                  </div>

                  <div className="bg-green-50 p-3 rounded-lg flex items-start border border-green-100">
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2 mt-0.5 shrink-0" />
                    <p className="text-xs text-green-800">
                      <strong>Free cancellation</strong> up to 2 hours before your scheduled drop-off time.
                    </p>
                  </div>

                  <button 
                    disabled={!selectedSize}
                    className={`w-full py-3.5 rounded-xl text-white font-bold text-lg flex items-center justify-center transition-all ${
                      selectedSize ? 'bg-primary hover:bg-primary-container shadow-md shadow-primary/20 hover:shadow-lg hover:-translate-y-0.5' : 'bg-gray-300 cursor-not-allowed'
                    }`}
                  >
                    Continue to Booking <ArrowRight className="w-5 h-5 ml-2" />
                  </button>

                  <div className="flex items-center justify-center text-xs text-secondary mt-4 space-x-4">
                    <span className="flex items-center"><Lock className="w-3.5 h-3.5 mr-1" /> Secure Payment</span>
                    <span className="flex items-center"><BadgeCheck className="w-3.5 h-3.5 mr-1" /> Verified Partner</span>
                  </div>
                </div>
              </div>

              {/* Help & Support */}
              <div className="bg-white p-5 rounded-xl border border-outline-variant/30 shadow-sm flex items-start">
                <div className="bg-blue-50 p-2.5 rounded-lg text-blue-600 mr-3 shrink-0">
                  <Headphones className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#0F172A] mb-1">Need assistance?</h4>
                  <p className="text-xs text-secondary mb-2">Our support team is available 24/7 for booking inquiries.</p>
                  <a href="tel:+8419001234" className="text-sm font-bold text-primary hover:underline">1900 1234 (Hotline)</a>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default StationBookingPage;
