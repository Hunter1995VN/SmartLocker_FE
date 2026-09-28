/**
 * AD-FE-03: UC-A03 — Add Station Modal
 * Modal tạo trạm tủ mới kèm cấu hình số lượng ô tủ S/M/L và bảng giá khởi tạo.
 * Kiểm tra hợp lệ dữ liệu toàn diện (GPS range, số nguyên không âm, tên và địa chỉ bắt buộc).
 */
import { useState } from 'react';
import { X, Plus, Layers, MapPin, Navigation, Tag, Clock } from 'lucide-react';
import type { CreateStationRequest } from '../../../api/adminStationService';

interface AddStationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (req: CreateStationRequest) => Promise<boolean>;
    isSubmitting: boolean;
}

export default function AddStationModal({
    isOpen,
    onClose,
    onSubmit,
    isSubmitting,
}: AddStationModalProps) {
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [latitude, setLatitude] = useState('16.053820');
    const [longitude, setLongitude] = useState('108.202214');
    const [opensAt, setOpensAt] = useState('06:00');
    const [closesAt, setClosesAt] = useState('22:00');
    const [contactPhone, setContactPhone] = useState('');

    // Locker quantity
    const [totalS, setTotalS] = useState('10');
    const [totalM, setTotalM] = useState('20');
    const [totalL] = useState('10');

    // Pricing
    const [priceS, setPriceS] = useState('10000');
    const [priceM, setPriceM] = useState('15000');
    const [priceL, setPriceL] = useState('20000');

    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [apiError, setApiError] = useState<string | null>(null);

    if (!isOpen) return null;

    const totalBays = (parseInt(totalS, 10) || 0) + (parseInt(totalM, 10) || 0) + (parseInt(totalL, 10) || 0);

    const validate = () => {
        const errs: { [key: string]: string } = {};

        if (!name.trim()) errs.name = 'Vui lòng nhập tên trạm';
        if (!address.trim()) errs.address = 'Vui lòng nhập địa chỉ đặt trạm';

        const lat = parseFloat(latitude);
        if (isNaN(lat)) {
            errs.latitude = 'Vĩ độ phải là số hợp lệ';
        } else if (lat < -90 || lat > 90) {
            errs.latitude = 'Vĩ độ phải nằm trong khoảng -90 đến 90';
        }

        const lng = parseFloat(longitude);
        if (isNaN(lng)) {
            errs.longitude = 'Kinh độ phải là số hợp lệ';
        } else if (lng < -180 || lng > 180) {
            errs.longitude = 'Kinh độ phải nằm trong khoảng -180 đến 180';
        }

        const sNum = Number(totalS);
        if (!Number.isInteger(sNum) || sNum < 0) {
            errs.totalS = 'Số lượng tủ S phải là số nguyên >= 0';
        }

        const mNum = Number(totalM);
        if (!Number.isInteger(mNum) || mNum < 0) {
            errs.totalM = 'Số lượng tủ M phải là số nguyên >= 0';
        }

        const lNum = Number(totalL);
        if (!Number.isInteger(lNum) || lNum < 0) {
            errs.totalL = 'Số lượng tủ L phải là số nguyên >= 0';
        }

        if (sNum + mNum + lNum <= 0) {
            errs.lockers = 'Trạm phải có ít nhất 1 ô tủ';
        }

        if (Number(priceS) < 0 || isNaN(Number(priceS))) errs.priceS = 'Giá S không hợp lệ';
        if (Number(priceM) < 0 || isNaN(Number(priceM))) errs.priceM = 'Giá M không hợp lệ';
        if (Number(priceL) < 0 || isNaN(Number(priceL))) errs.priceL = 'Giá L không hợp lệ';

        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setApiError(null);

        if (!validate()) return;

        const req: CreateStationRequest = {
            name: name.trim(),
            address: address.trim(),
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            opensAt,
            closesAt,
            contactPhone: contactPhone.trim() || undefined,
            totalS: parseInt(totalS, 10),
            totalM: parseInt(totalM, 10),
            totalL: parseInt(totalL, 10),
            priceSPerBlock: Number(priceS),
            priceMPerBlock: Number(priceM),
            priceLPerBlock: Number(priceL),
        };

        const success = await onSubmit(req);
        if (!success) {
            setApiError('Không thể tạo trạm tủ. Vui lòng kiểm tra lại thông tin hoặc thử lại sau.');
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                            <Plus className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                                Thêm Trạm Tủ Mới (Add Station)
                            </h3>
                            <p className="text-[11px] text-slate-400">
                                Cấu hình thông tin vị trí, số ngăn tủ S/M/L và giá khởi tạo
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                    {apiError && (
                        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
                            {apiError}
                        </div>
                    )}

                    {/* Section 1: Basic Info */}
                    <div>
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <Layers className="w-4 h-4 text-blue-600" />
                            <span>1. Thông tin trạm tủ</span>
                        </h4>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Tên trạm tủ <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => {
                                        setName(e.target.value);
                                        if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                                    }}
                                    placeholder="Ví dụ: Ga Đà Nẵng Central Station"
                                    className={`w-full px-3 py-2 bg-white border rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 ${
                                        errors.name ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200 focus:ring-blue-200'
                                    }`}
                                />
                                {errors.name && <p className="text-[11px] text-rose-500 mt-1">{errors.name}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Địa chỉ chi tiết <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={address}
                                    onChange={(e) => {
                                        setAddress(e.target.value);
                                        if (errors.address) setErrors(prev => ({ ...prev, address: '' }));
                                    }}
                                    placeholder="Ví dụ: 200 Hải Phòng, Tam Thuận, Thanh Khê, Đà Nẵng"
                                    className={`w-full px-3 py-2 bg-white border rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 ${
                                        errors.address ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200 focus:ring-blue-200'
                                    }`}
                                />
                                {errors.address && <p className="text-[11px] text-rose-500 mt-1">{errors.address}</p>}
                            </div>

                            {/* GPS Coordinates */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Vĩ độ GPS (Latitude) <span className="text-rose-500">*</span>
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
                                            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                        />
                                    </div>
                                    {errors.latitude && <p className="text-[11px] text-rose-500 mt-1">{errors.latitude}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Kinh độ GPS (Longitude) <span className="text-rose-500">*</span>
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
                                            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
                                        />
                                    </div>
                                    {errors.longitude && <p className="text-[11px] text-rose-500 mt-1">{errors.longitude}</p>}
                                </div>
                            </div>

                            {/* Hours & Phone */}
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Giờ mở cửa</label>
                                    <input
                                        type="time"
                                        value={opensAt}
                                        onChange={(e) => setOpensAt(e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">Giờ đóng cửa</label>
                                    <input
                                        type="time"
                                        value={closesAt}
                                        onChange={(e) => setClosesAt(e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">SĐT hỗ trợ</label>
                                    <input
                                        type="tel"
                                        placeholder="0901234567"
                                        value={contactPhone}
                                        onChange={(e) => setContactPhone(e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Locker S/M/L Allocation */}
                    <div className="pt-4 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                <Clock className="w-4 h-4 text-indigo-600" />
                                <span>2. Cấu hình số ô tủ (Total: {totalBays} ngăn)</span>
                            </h4>
                            {errors.lockers && <span className="text-[11px] font-bold text-rose-500">{errors.lockers}</span>}
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200">
                                <label className="block text-xs font-black text-blue-800 mb-1">Cỡ S (Small)</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={totalS}
                                    onChange={(e) => setTotalS(e.target.value)}
                                    className="w-full px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none"
                                />
                                {errors.totalS && <p className="text-[10px] text-rose-500 mt-1">{errors.totalS}</p>}
                            </div>

                            <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200">
                                <label className="block text-xs font-black text-indigo-800 mb-1">Cỡ M (Medium)</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={totalM}
                                    onChange={(e) => setTotalM(e.target.value)}
                                    className="w-full px-3 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none"
                                />
                                {errors.totalM && <p className="text-[10px] text-rose-500 mt-1">{errors.totalM}</p>}
                            </div>

                            <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200">
                                <label className="block text-xs font-black text-purple-800 mb-1">Cỡ L (Large)</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={totalL}
                                    onChange={(e) => setPriceL(e.target.value)}
                                    className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none"
                                />
                                {errors.totalL && <p className="text-[10px] text-rose-500 mt-1">{errors.totalL}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Initial Pricing */}
                    <div className="pt-4 border-t border-slate-100">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <Tag className="w-4 h-4 text-amber-600" />
                            <span>3. Bảng giá khởi tạo (VNĐ / giờ)</span>
                        </h4>

                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Giá tủ S</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="1000"
                                    value={priceS}
                                    onChange={(e) => setPriceS(e.target.value)}
                                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Giá tủ M</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="1000"
                                    value={priceM}
                                    onChange={(e) => setPriceM(e.target.value)}
                                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Giá tủ L</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="1000"
                                    value={priceL}
                                    onChange={(e) => setPriceL(e.target.value)}
                                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
                        >
                            Hủy
                        </button>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-500/20 disabled:opacity-50 transition cursor-pointer"
                        >
                            {isSubmitting ? (
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Plus className="w-4 h-4" />
                            )}
                            <span>Tạo Trạm Tủ</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
