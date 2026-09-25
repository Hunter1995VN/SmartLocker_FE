/**
 * AD-FE-03: UC-A03 — Manage Stations
 * Tab 1: Station Info & GPS Coordinates.
 * Cho phép xem và chỉnh sửa thông tin chi tiết trạm, tọa độ GPS, bán kính Geofence, và thông số phần cứng IoT Gateway.
 */
import { useState } from 'react';
import {
    MapPin,
    Navigation,
    Lock,
    ExternalLink,
    Cpu,
    Trash2,
    Save,
    RotateCcw,
    CheckCircle2,
    AlertCircle,
} from 'lucide-react';
import type { StationAdminDetailDto, UpdateStationRequest } from '../../../api/adminStationService';

interface StationInfoTabProps {
    station: StationAdminDetailDto;
    onUpdateSuccess: (updatedStation: StationAdminDetailDto) => void;
    onDeleteRequest: () => void;
    isUpdating: boolean;
    onSave: (req: UpdateStationRequest) => Promise<boolean>;
}

export default function StationInfoTab({
    station,
    onDeleteRequest,
    isUpdating,
    onSave,
}: StationInfoTabProps) {
    // Form fields
    const [name, setName] = useState(station.name);
    const [address, setAddress] = useState(station.address);
    const [latitude, setLatitude] = useState(String(station.latitude));
    const [longitude, setLongitude] = useState(String(station.longitude));
    const [status, setStatus] = useState<StationAdminDetailDto['status']>(station.status);
    const [opensAt, setOpensAt] = useState(station.opensAt || '06:00');
    const [closesAt, setClosesAt] = useState(station.closesAt || '22:00');
    const [contactPhone, setContactPhone] = useState(station.contactPhone || '');

    // Form validation errors
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);



    const validate = () => {
        const errs: { [key: string]: string } = {};

        if (!name.trim()) {
            errs.name = 'Tên trạm không được để trống';
        }

        if (!address.trim()) {
            errs.address = 'Địa chỉ không được để trống';
        }

        const latNum = parseFloat(latitude);
        if (isNaN(latNum)) {
            errs.latitude = 'Vĩ độ (Latitude) phải là số';
        } else if (latNum < -90 || latNum > 90) {
            errs.latitude = 'Vĩ độ phải trong khoảng từ -90 đến 90';
        }

        const lngNum = parseFloat(longitude);
        if (isNaN(lngNum)) {
            errs.longitude = 'Kinh độ (Longitude) phải là số';
        } else if (lngNum < -180 || lngNum > 180) {
            errs.longitude = 'Kinh độ phải trong khoảng từ -180 đến 180';
        }

        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFeedbackMsg(null);

        if (!validate()) return;

        const success = await onSave({
            name: name.trim(),
            address: address.trim(),
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            status,
            opensAt,
            closesAt,
            contactPhone: contactPhone.trim() || undefined,
        });

        if (success) {
            setFeedbackMsg({ type: 'success', text: 'Cập nhật trạm và đẩy cấu hình thành công!' });
        } else {
            setFeedbackMsg({ type: 'error', text: 'Có lỗi xảy ra khi cập nhật trạm. Vui lòng thử lại.' });
        }
    };

    const handleReset = () => {
        setName(station.name);
        setAddress(station.address);
        setLatitude(String(station.latitude));
        setLongitude(String(station.longitude));
        setStatus(station.status);
        setOpensAt(station.opensAt || '06:00');
        setClosesAt(station.closesAt || '22:00');
        setContactPhone(station.contactPhone || '');
        setErrors({});
        setFeedbackMsg(null);
    };

    const openGoogleMaps = () => {
        const url = `https://www.google.com/maps?q=${latitude},${longitude}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    return (
        <form onSubmit={handleFormSubmit} className="space-y-5">
            {feedbackMsg && (
                <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                    feedbackMsg.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}>
                    {feedbackMsg.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>{feedbackMsg.text}</span>
                </div>
            )}

            {/* Row 1: Station Code & Display Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                        <span>Mã trạm (Station ID)</span>
                        <span className="text-[10px] text-slate-400 font-normal">Hệ thống gán cố định</span>
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            readOnly
                            value={station.id.slice(0, 8).toUpperCase()}
                            className="w-full pl-3 pr-9 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-600 cursor-not-allowed select-all"
                        />
                        <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Định danh duy nhất ánh xạ tới MCU vi điều khiển</p>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                        Tên hiển thị trạm (Station Name) <span className="text-rose-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => {
                            setName(e.target.value);
                            if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                        }}
                        className={`w-full px-3 py-2.5 bg-white border rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 transition ${
                            errors.name
                                ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500'
                                : 'border-slate-200 focus:ring-blue-500/20 focus:border-blue-500'
                        }`}
                        placeholder="Nhập tên trạm..."
                    />
                    {errors.name ? (
                        <p className="text-[11px] text-rose-500 font-semibold mt-1">{errors.name}</p>
                    ) : (
                        <p className="text-[11px] text-slate-400 mt-1">Hiển thị cho khách hàng trên web & mobile portal</p>
                    )}
                </div>
            </div>

            {/* Row 2: Detailed Address */}
            <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                    Địa chỉ chi tiết (Address Specification) <span className="text-rose-500">*</span>
                </label>
                <input
                    type="text"
                    value={address}
                    onChange={(e) => {
                        setAddress(e.target.value);
                        if (errors.address) setErrors(prev => ({ ...prev, address: '' }));
                    }}
                    className={`w-full px-3 py-2.5 bg-white border rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 transition ${
                        errors.address
                            ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500'
                            : 'border-slate-200 focus:ring-blue-500/20 focus:border-blue-500'
                    }`}
                    placeholder="Nhập địa chỉ vị trí đặt trạm..."
                />
                {errors.address && (
                    <p className="text-[11px] text-rose-500 font-semibold mt-1">{errors.address}</p>
                )}
            </div>

            {/* Row 3: GPS Latitude & Longitude & Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                        GPS Vĩ độ (Latitude) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={latitude}
                            onChange={(e) => {
                                setLatitude(e.target.value);
                                if (errors.latitude) setErrors(prev => ({ ...prev, latitude: '' }));
                            }}
                            className={`w-full pl-9 pr-3 py-2.5 bg-white border rounded-xl text-xs font-mono text-slate-900 font-semibold focus:outline-none focus:ring-2 transition ${
                                errors.latitude
                                    ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500'
                                    : 'border-slate-200 focus:ring-blue-500/20 focus:border-blue-500'
                            }`}
                            placeholder="Ví dụ: 16.053820"
                        />
                    </div>
                    {errors.latitude ? (
                        <p className="text-[11px] text-rose-500 font-semibold mt-1">{errors.latitude}</p>
                    ) : (
                        <p className="text-[11px] text-slate-400 mt-1">Phạm vi hợp lệ: -90 đến 90</p>
                    )}
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                        GPS Kinh độ (Longitude) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                        <Navigation className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={longitude}
                            onChange={(e) => {
                                setLongitude(e.target.value);
                                if (errors.longitude) setErrors(prev => ({ ...prev, longitude: '' }));
                            }}
                            className={`w-full pl-9 pr-3 py-2.5 bg-white border rounded-xl text-xs font-mono text-slate-900 font-semibold focus:outline-none focus:ring-2 transition ${
                                errors.longitude
                                    ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500'
                                    : 'border-slate-200 focus:ring-blue-500/20 focus:border-blue-500'
                            }`}
                            placeholder="Ví dụ: 108.202214"
                        />
                    </div>
                    {errors.longitude ? (
                        <p className="text-[11px] text-rose-500 font-semibold mt-1">{errors.longitude}</p>
                    ) : (
                        <p className="text-[11px] text-slate-400 mt-1">Phạm vi hợp lệ: -180 đến 180</p>
                    )}
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                        Trạng thái vận hành
                    </label>
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as StationAdminDetailDto['status'])}
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                    >
                        <option value="ACTIVE">ACTIVE (Hoạt động)</option>
                        <option value="MAINTENANCE">MAINTENANCE (Bảo trì)</option>
                        <option value="INACTIVE">INACTIVE (Ngưng hoạt động)</option>
                    </select>
                    <p className="text-[11px] text-slate-400 mt-1">Trạng thái phát tín hiệu cho app</p>
                </div>
            </div>

            {/* Row 4: Visual Location & Geofence Boundary Preview */}
            <div className="bg-slate-50/70 rounded-2xl border border-slate-200/80 p-4">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-blue-600" />
                        <span>Visual Location & Geofence Boundary</span>
                    </span>
                    <span className="text-[11px] font-bold text-blue-700 bg-blue-100/60 px-2 py-0.5 rounded-lg border border-blue-200">
                        Bán kính BLE / Geofence: 50 mét
                    </span>
                </div>

                {/* Simulated Geofence Map */}
                <div className="relative h-44 rounded-xl overflow-hidden border border-slate-200 bg-[#e5ebee] flex items-center justify-center">
                    {/* SVG Map Lines & Water Representation */}
                    <svg className="absolute inset-0 w-full h-full opacity-60" xmlns="http://www.w3.org/2000/svg">
                        <path d="M0,80 Q200,60 400,90 T800,70 L800,200 L0,200 Z" fill="#cbe2ee" />
                        <line x1="50" y1="0" x2="120" y2="200" stroke="#cbd5e1" strokeWidth="3" />
                        <line x1="180" y1="0" x2="260" y2="200" stroke="#cbd5e1" strokeWidth="4" />
                        <line x1="300" y1="0" x2="350" y2="200" stroke="#e2e8f0" strokeWidth="2" />
                        <line x1="0" y1="110" x2="800" y2="90" stroke="#f1f5f9" strokeWidth="4" />
                        <circle cx="50%" cy="50%" r="55" fill="#3b82f6" fillOpacity="0.12" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4 3" />
                    </svg>

                    {/* Central Locker Icon & Beacon Pulse */}
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/40 flex items-center justify-center border-2 border-white animate-bounce">
                            <Lock className="w-5 h-5" />
                        </div>
                        <div className="mt-1.5 px-2.5 py-0.5 rounded-full bg-slate-900/80 backdrop-blur-sm text-white text-[10px] font-mono font-bold tracking-tight shadow">
                            GPS Fixed: {parseFloat(latitude || '0').toFixed(6)}, {parseFloat(longitude || '0').toFixed(6)}
                        </div>
                    </div>

                    {/* Pin on Google Maps Button */}
                    <button
                        type="button"
                        onClick={openGoogleMaps}
                        className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/95 backdrop-blur-sm border border-slate-200 text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:bg-white shadow-sm transition cursor-pointer"
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Mở Google Maps</span>
                    </button>

                    {/* Geofence info badge at bottom */}
                    <div className="absolute bottom-2 left-2.5 z-20 flex items-center gap-1.5 text-[10px] font-semibold text-slate-600 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-md border border-slate-200">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                        Bluetooth Beacon Auto-detect Geofence (R = 50m)
                    </div>
                </div>
            </div>

            {/* Row 5: IoT Gateway & Kiosk Hardware Specs */}
            <div className="bg-slate-50/80 rounded-2xl border border-slate-200 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-slate-200/80 flex items-center justify-center text-slate-700">
                        <Cpu className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">IoT Gateway & Specs</p>
                        <p className="font-semibold text-slate-800">LAN IP: 192.168.10.42</p>
                    </div>
                </div>

                <div className="text-slate-600">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Controller</span>
                    <span className="font-semibold">ARM Cortex-M4 STM32F4</span>
                </div>

                <div className="text-slate-600">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Weight Sensor</span>
                    <span className="font-semibold text-emerald-600">Calibrated (Active)</span>
                </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                {/* Left: Delete Station */}
                <button
                    type="button"
                    onClick={onDeleteRequest}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition cursor-pointer"
                >
                    <Trash2 className="w-4 h-4" />
                    <span>Ngưng hoạt động / Xóa trạm</span>
                </button>

                {/* Right: Reset & Save */}
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleReset}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Hủy bỏ</span>
                    </button>

                    <button
                        type="submit"
                        disabled={isUpdating}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-500/20 disabled:opacity-50 transition cursor-pointer"
                    >
                        {isUpdating ? (
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        <span>Lưu & Đẩy cấu hình Edge IoT</span>
                    </button>
                </div>
            </div>
        </form>
    );
}
