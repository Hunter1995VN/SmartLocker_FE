/**
 * AD-FE-03: UC-A03, UC-A04 — Manage Stations & Lockers
 * Panel chi tiết trạm bên cột phải: Station Detail Panel.
 * Tích hợp 3 Tab điều khiển:
 * 1. Station Info & GPS
 * 2. S/M/L Compartments
 * 3. Pricing Matrix
 */
import { useState } from 'react';
import {
    MapPin,
    Layers,
    Tag,
    SlidersHorizontal,
} from 'lucide-react';
import type {
    StationAdminDetailDto,
    UpdateStationRequest,
} from '../../../api/adminStationService';
import StationInfoTab from './StationInfoTab';
import StationCompartmentsTab from './StationCompartmentsTab';
import StationPricingTab from './StationPricingTab';

interface StationDetailPanelProps {
    station: StationAdminDetailDto | null;
    isLoading: boolean;
    onUpdateStation: (req: UpdateStationRequest) => Promise<boolean>;
    onDeleteRequest: () => void;
    onRefreshStation: () => void;
    isUpdating: boolean;
}

export default function StationDetailPanel({
    station,
    isLoading,
    onUpdateStation,
    onDeleteRequest,
    onRefreshStation,
    isUpdating,
}: StationDetailPanelProps) {
    const [activeTab, setActiveTab] = useState<'info' | 'lockers' | 'pricing'>('info');

    if (isLoading) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 flex flex-col items-center justify-center min-h-[480px]">
                <div className="w-8 h-8 border-3 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mb-3" />
                <p className="text-xs font-semibold text-slate-500">Đang tải thông tin trạm tủ...</p>
            </div>
        );
    }

    if (!station) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-12 text-center flex flex-col items-center justify-center min-h-[480px]">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 border border-blue-100">
                    <Layers className="w-7 h-7 stroke-[1.5]" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">Chưa chọn trạm tủ</h3>
                <p className="text-xs text-slate-500 max-w-sm">
                    Vui lòng nhấp chọn một trạm từ danh sách mạng lưới bên trái để xem chi tiết thông số và cấu hình ô tủ, bảng giá.
                </p>
            </div>
        );
    }

    const shortId = station.id.slice(0, 6).toUpperCase();
    const isOnline = station.status === 'ACTIVE';

    return (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm flex flex-col overflow-hidden">
            {/* Header: Station Identity, Status & Firmware */}
            <div className="p-5 border-b border-slate-100 flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                        <SlidersHorizontal className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                                {station.name}
                            </h2>
                            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-mono font-bold text-xs border border-blue-200">
                                {shortId}
                            </span>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                isOnline
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                                {isOnline ? 'Active (Online)' : station.status}
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 font-mono">
                            Kiosk Gateway ID: <span className="text-slate-600 font-semibold">GW-{shortId}-STM32</span> · Firmware: <span className="text-slate-600 font-semibold">v4.8.2-prod</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs (3 Tabs) */}
            <div className="px-5 pt-3 border-b border-slate-200/80 bg-slate-50/50 flex items-center gap-2 overflow-x-auto scrollbar-none">
                <button
                    type="button"
                    onClick={() => setActiveTab('info')}
                    className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                        activeTab === 'info'
                            ? 'border-blue-600 text-blue-600 bg-white rounded-t-xl shadow-xs'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                    <MapPin className="w-4 h-4" />
                    <span>1. Station Info & GPS</span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('lockers')}
                    className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                        activeTab === 'lockers'
                            ? 'border-blue-600 text-blue-600 bg-white rounded-t-xl shadow-xs'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                    <Layers className="w-4 h-4" />
                    <span>2. S/M/L Compartments</span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('pricing')}
                    className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                        activeTab === 'pricing'
                            ? 'border-blue-600 text-blue-600 bg-white rounded-t-xl shadow-xs'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                    <Tag className="w-4 h-4" />
                    <span>3. Pricing Matrix</span>
                </button>
            </div>

            {/* Tab Body */}
            <div className="p-5 overflow-y-auto">
                {activeTab === 'info' && (
                    <StationInfoTab
                        key={station.id}
                        station={station}
                        onUpdateSuccess={() => onRefreshStation()}
                        onDeleteRequest={onDeleteRequest}
                        isUpdating={isUpdating}
                        onSave={onUpdateStation}
                    />
                )}

                {activeTab === 'lockers' && (
                    <StationCompartmentsTab
                        key={station.id}
                        station={station}
                    />
                )}

                {activeTab === 'pricing' && (
                    <StationPricingTab
                        key={station.id}
                        station={station}
                        onPricingUpdated={onRefreshStation}
                    />
                )}
            </div>
        </div>
    );
}
