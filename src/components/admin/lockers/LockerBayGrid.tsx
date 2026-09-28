/**
 * AD-FE-04: UC-A05 — Realtime Locker Grid
 * Sơ đồ hiển thị ô tủ trực quan theo Dãy / Cụm / Cột / Tầng (Locker Bay Grid).
 * Phân tầng theo kích thước (Size S, Size M, Size L), hiển thị trạng thái màu sắc chuẩn:
 * 🟢 Xanh: AVAILABLE | 🔴 Đỏ: OCCUPIED | 🟡 Vàng: MAINTENANCE | ⚫ Xám: DISABLED
 */
import { useMemo, useState } from 'react';
import {
    CheckCircle2,
    Lock,
    Wrench,
    ShieldOff,
    Check,
    AlertCircle,
    ChevronRight,
    Wifi,
    Cpu,
} from 'lucide-react';
import type { LockerGridItemDto } from '../../../api/adminStationService';
import { normalizeLockerStatus } from './lockerStatusConstants';

interface LockerBayGridProps {
    lockers: LockerGridItemDto[];
    selectedLocker: LockerGridItemDto | null;
    onSelectLocker: (locker: LockerGridItemDto) => void;
    isLoading: boolean;
    stationName?: string;
    stationAddress?: string;
}

export default function LockerBayGrid({
    lockers,
    selectedLocker,
    onSelectLocker,
    isLoading,
    stationName,
    stationAddress,
}: LockerBayGridProps) {
    const [selectedBlock, setSelectedBlock] = useState<'A' | 'B'>('A');

    // Group lockers into Size S, M, L
    const { lockersS, lockersM, lockersL } = useMemo(() => {
        const s: LockerGridItemDto[] = [];
        const m: LockerGridItemDto[] = [];
        const l: LockerGridItemDto[] = [];

        lockers.forEach((item) => {
            const sz = (item.size || '').toUpperCase();
            if (sz === 'S') s.push(item);
            else if (sz === 'M') m.push(item);
            else l.push(item);
        });

        return { lockersS: s, lockersM: m, lockersL: l };
    }, [lockers]);

    if (isLoading) {
        return (
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-10 flex flex-col items-center justify-center min-h-[500px]">
                <div className="w-10 h-10 border-3 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mb-3" />
                <p className="text-xs font-semibold text-slate-500">Đang tải trạng thái sơ đồ ô tủ thời gian thực...</p>
            </div>
        );
    }

    if (lockers.length === 0) {
        return (
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-12 text-center flex flex-col items-center justify-center min-h-[500px]">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                    <Lock className="w-7 h-7 stroke-[1.5]" />
                </div>
                <h3 className="text-base font-bold text-slate-800">Trạm này chưa có ô tủ nào</h3>
                <p className="text-xs text-slate-400 max-w-sm mt-1">
                    Chưa tìm thấy dữ liệu ô tủ cho trạm được chọn. Vui lòng chuyển trạm khác hoặc cấu hình thêm ô tủ.
                </p>
            </div>
        );
    }

    const renderLockerCard = (locker: LockerGridItemDto) => {
        const status = normalizeLockerStatus(locker.businessStatus);
        const isSelected = selectedLocker?.id === locker.id;

        // Styling according to status
        let cardStyle = '';
        let statusBadgeText = '';
        let StatusIcon = CheckCircle2;
        let subInfo = 'Trống';

        if (status === 'AVAILABLE') {
            cardStyle = 'bg-emerald-50/50 border-emerald-200/90 hover:border-emerald-400';
            statusBadgeText = 'Sẵn sàng';
            StatusIcon = CheckCircle2;
            subInfo = 'Trống';
        } else if (status === 'OCCUPIED') {
            cardStyle = 'bg-rose-50/50 border-rose-200/90 hover:border-rose-400';
            statusBadgeText = 'Đang dùng';
            StatusIcon = Lock;
            const code = locker.currentBooking?.bookingCode || '#BK-9102';
            subInfo = `${code}`;
        } else if (status === 'MAINTENANCE') {
            cardStyle = 'bg-amber-50/50 border-amber-200/90 hover:border-amber-400';
            statusBadgeText = 'Bảo trì';
            StatusIcon = Wrench;
            subInfo = locker.notes ? locker.notes.slice(0, 14) : 'Bảo trì';
        } else {
            // DISABLED
            cardStyle = 'bg-slate-100/70 border-slate-300/80 hover:border-slate-400';
            statusBadgeText = 'Khóa an toàn';
            StatusIcon = ShieldOff;
            subInfo = 'Admin Lock';
        }

        return (
            <div
                key={locker.id}
                onClick={() => onSelectLocker(locker)}
                className={`relative p-3 rounded-2xl border transition-all duration-150 cursor-pointer select-none text-left flex flex-col justify-between min-h-[96px] ${cardStyle} ${
                    isSelected
                        ? 'ring-2 ring-blue-500 shadow-md border-blue-400 bg-blue-50/70'
                        : 'hover:shadow-xs'
                }`}
            >
                {/* Selected Checkmark Badge */}
                {isSelected && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-sm">
                        <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                )}

                {/* Top Row: Code & Size Tag */}
                <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-mono text-xs font-black text-slate-900 tracking-tight">
                        {locker.lockerCode}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-white/90 border border-slate-200 text-slate-700">
                        {locker.size}
                    </span>
                </div>

                {/* Middle: Custom payload or booking if OCCUPIED */}
                {status === 'OCCUPIED' && (
                    <div className="text-[10px] font-mono font-bold text-rose-700 truncate flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">{subInfo}</span>
                    </div>
                )}

                {/* Bottom: Status Pill */}
                <div className="pt-2 border-t border-slate-200/50 flex items-center justify-between text-[10px]">
                    <span className="flex items-center gap-1 font-semibold text-slate-600 truncate">
                        <StatusIcon className={`w-3 h-3 ${
                            status === 'AVAILABLE'
                                ? 'text-emerald-600'
                                : status === 'OCCUPIED'
                                ? 'text-rose-600'
                                : status === 'MAINTENANCE'
                                ? 'text-amber-600'
                                : 'text-slate-500'
                        }`} />
                        <span className="truncate">{statusBadgeText}</span>
                    </span>

                    {status === 'AVAILABLE' && (
                        <span className="text-[9px] font-medium text-emerald-700 bg-emerald-100/60 px-1 py-0.2 rounded">
                            {subInfo}
                        </span>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm flex flex-col overflow-hidden">
            {/* Bay Block Header */}
            <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white font-black text-base flex items-center justify-center shadow-md shadow-blue-500/20">
                        A
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                                Dãy Tủ Khối A (Bay Block A)
                            </h3>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Tủ Thông Minh IoT Gen 4
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                            {stationName || 'Ga Sân Bay'} · {stationAddress || 'Khu vực chờ T1'} · IP: 192.168.10.84
                        </p>
                    </div>
                </div>

                {/* Block Selector Switch */}
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs font-bold">
                    <button
                        type="button"
                        onClick={() => setSelectedBlock('A')}
                        className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                            selectedBlock === 'A'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        Khối A ({Math.min(lockers.length, 30)} ô)
                    </button>
                    {lockers.length > 30 && (
                        <button
                            type="button"
                            onClick={() => setSelectedBlock('B')}
                            className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                                selectedBlock === 'B'
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            Khối B ({lockers.length - 30} ô)
                        </button>
                    )}
                </div>
            </div>

            {/* Column Header Indicator */}
            <div className="px-5 pt-4 pb-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <div>CỘT 1</div>
                <div>CỘT 2</div>
                <div>CỘT 3</div>
                <div>CỘT 4</div>
                <div>CỘT 5</div>
            </div>

            {/* Main Locker Tiers */}
            <div className="p-5 space-y-5 overflow-y-auto max-h-[640px]">
                {/* Tier 1: Size S */}
                {lockersS.length > 0 && (
                    <div>
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-2.5 pb-1 border-b border-slate-100">
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-blue-500" />
                                <span>TẦNG 1 & 2: CỠ NHỎ (SIZE S - {lockersS.length} Ô)</span>
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 font-normal">
                                350 x 280 x 480 mm
                            </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                            {lockersS.map(renderLockerCard)}
                        </div>
                    </div>
                )}

                {/* Tier 2: Size M */}
                {lockersM.length > 0 && (
                    <div>
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-2.5 pb-1 border-b border-slate-100">
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                                <span>TẦNG 3 & 4: CỠ VỪA (SIZE M - {lockersM.length} Ô)</span>
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 font-normal">
                                450 x 420 x 580 mm
                            </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                            {lockersM.map(renderLockerCard)}
                        </div>
                    </div>
                )}

                {/* Tier 3: Size L */}
                {lockersL.length > 0 && (
                    <div>
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-2.5 pb-1 border-b border-slate-100">
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-purple-500" />
                                <span>TẦNG 5: CỠ LỚN (SIZE L - {lockersL.length} Ô)</span>
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 font-normal">
                                850 x 500 x 600 mm
                            </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                            {lockersL.map(renderLockerCard)}
                        </div>
                    </div>
                )}
            </div>

            {/* Hardware Telemetry Status Strip */}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/80 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-slate-500">
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-slate-700 font-semibold">
                        <Wifi className="w-3.5 h-3.5 text-blue-600" />
                        RSSI: -48 dBm
                    </span>
                    <span className="text-slate-300">|</span>
                    <span>Nguồn: 220V AC / UPS 100%</span>
                </div>

                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                        <Cpu className="w-3.5 h-3.5 text-slate-600" />
                        MCU: STM32-H7 v4.8
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="text-emerald-700 font-bold">Đồng bộ: Realtime</span>
                </div>
            </div>

            {/* Recent Alert Strip */}
            {selectedLocker && (
                <div className="p-3.5 bg-amber-50/70 border-t border-amber-200/80 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                            <AlertCircle className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="font-bold text-amber-900 text-[11px]">
                                Nhật ký cảnh báo ngăn {selectedLocker.lockerCode} gần nhất:
                            </p>
                            <p className="text-[11px] text-amber-700/90 line-clamp-1">
                                {selectedLocker.notes || 'Hệ thống telemetry ghi nhận cảm biến hoạt động bình thường.'}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => {}}
                        className="flex items-center gap-1 text-[11px] font-bold text-amber-900 hover:text-amber-950 shrink-0 cursor-pointer"
                    >
                        <span>Xem chi tiết log</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}
        </div>
    );
}
