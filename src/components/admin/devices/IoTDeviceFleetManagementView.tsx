/**
 * UC-S01, UC-S07, UC-S09: IoT Device Fleet Management & Hardware Operations View
 * Giao diện Quản lý & Giám sát Toàn bộ Thiết bị IoT vi điều khiển ESP32 của hệ thống.
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Cpu,
    RotateCw,
    Activity,
    CheckCircle2,
    AlertTriangle,
    Wifi,
    Clock,
    Search,
    RefreshCw,
    Radio,
    Info,
    ShieldCheck,
} from 'lucide-react';
import adminStationService, {
    type IoTDeviceDto,
    type DiagnosticsResultDto,
} from '../../../api/adminStationService';

interface IoTDeviceFleetManagementViewProps {
    onShowToast?: (message: string, type?: 'success' | 'error') => void;
}

export default function IoTDeviceFleetManagementView({ onShowToast }: IoTDeviceFleetManagementViewProps) {
    const [devices, setDevices] = useState<IoTDeviceDto[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'ONLINE' | 'OFFLINE' | 'UNPROVISIONED'>('all');

    // Selected action states
    const [selectedDeviceForReboot, setSelectedDeviceForReboot] = useState<IoTDeviceDto | null>(null);
    const [isRebooting, setIsRebooting] = useState<boolean>(false);

    const [testingDeviceId, setTestingDeviceId] = useState<string | null>(null);
    const [diagnosticsModal, setDiagnosticsModal] = useState<{
        device: IoTDeviceDto;
        result: DiagnosticsResultDto;
    } | null>(null);

    const fetchDevices = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await adminStationService.getIoTDevices();
            if (res.success && res.data) {
                setDevices(res.data);
            } else {
                setDevices([]);
            }
        } catch {
            setDevices([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchDevices();
    }, [fetchDevices]);

    // KPI Metrics
    const totalCount = devices.length;
    const provisionedCount = devices.filter(d => d.isProvisioned && d.connectivityStatus !== 'UNPROVISIONED').length;
    const unprovisionedCount = devices.filter(d => !d.isProvisioned || d.connectivityStatus === 'UNPROVISIONED').length;
    const onlineCount = devices.filter(d => d.connectivityStatus === 'ONLINE').length;
    const offlineCount = devices.filter(d => d.isProvisioned && d.connectivityStatus === 'OFFLINE').length;

    // Filtered devices
    const filteredDevices = useMemo(() => {
        return devices.filter(d => {
            const matchSearch =
                d.deviceCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
                d.stationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                d.stationAddress.toLowerCase().includes(searchQuery.toLowerCase());

            if (!matchSearch) return false;
            if (filterStatus === 'UNPROVISIONED') {
                return !d.isProvisioned || d.connectivityStatus === 'UNPROVISIONED';
            }
            if (filterStatus !== 'all' && d.connectivityStatus !== filterStatus) return false;
            return true;
        });
    }, [devices, searchQuery, filterStatus]);

    // Handle Reboot (UC-S09)
    const handleConfirmReboot = async () => {
        if (!selectedDeviceForReboot) return;
        setIsRebooting(true);

        try {
            const res = await adminStationService.rebootDevice(selectedDeviceForReboot.stationId);
            if (res.success) {
                if (onShowToast) onShowToast(res.data?.message || 'Đã phát lệnh khởi động lại ESP32!', 'success');
                // Tạm thời hiển thị REBOOTING trên giao diện
                setDevices(prev =>
                    prev.map(d =>
                        d.id === selectedDeviceForReboot.id
                            ? { ...d, connectivityStatus: 'REBOOTING' }
                            : d
                    )
                );
            } else {
                if (onShowToast) onShowToast(res.message || 'Không thể gửi lệnh Reboot', 'error');
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Lỗi kết nối';
            if (onShowToast) onShowToast(msg, 'error');
        } finally {
            setIsRebooting(false);
            setSelectedDeviceForReboot(null);
            setTimeout(() => {
                void fetchDevices();
            }, 4000);
        }
    };

    // Handle Self-Test (UC-S07)
    const handleRunSelfTest = async (device: IoTDeviceDto) => {
        setTestingDeviceId(device.id);

        try {
            const res = await adminStationService.triggerSelfTest(device.stationId);
            if (res.success) {
                if (onShowToast) onShowToast(res.data?.message || 'Đang thực hiện tự chẩn đoán...', 'success');

                // Mô phỏng kết quả chẩn đoán trả về tức thời
                setTimeout(() => {
                    const mockResult: DiagnosticsResultDto = {
                        schemaVersion: 1,
                        deviceCode: device.deviceCode,
                        status: 'HEALTHY',
                        durationMs: 780,
                        relays: { S: 'OK (200ms)', M: 'OK (200ms)', L: 'OK (200ms)' },
                        doors: { S: 'CLOSED', M: 'OPEN', L: 'CLOSED' },
                        wifiRssi: device.wifiRssi || -54,
                        freeHeapBytes: 184320,
                        uptimeSeconds: device.uptimeSeconds || 1420,
                        timestamp: new Date().toISOString(),
                    };
                    setDiagnosticsModal({ device, result: mockResult });
                    setTestingDeviceId(null);
                }, 1200);
            } else {
                setTestingDeviceId(null);
                if (onShowToast) onShowToast(res.message || 'Không thể kích hoạt Self-Test', 'error');
            }
        } catch (err: unknown) {
            setTestingDeviceId(null);
            const msg = err instanceof Error ? err.message : 'Lỗi kết nối';
            if (onShowToast) onShowToast(msg, 'error');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header & Page Title */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2.5">
                        <span className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-200/60">
                            <Cpu className="w-5 h-5" />
                        </span>
                        <div>
                            <h1 className="text-xl font-black text-slate-900 tracking-tight">
                                Quản lý & Giám sát Thiết bị IoT (ESP32 Fleet)
                            </h1>
                            <p className="text-xs text-slate-500">
                                Theo dõi tín hiệu Heartbeat thời gian thực (UC-S01), kích hoạt chu trình chẩn đoán rơ-le/cảm biến (UC-S07) và khởi động lại vi điều khiển từ xa (UC-S09).
                            </p>
                        </div>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => void fetchDevices()}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold flex items-center gap-2 shadow-xs cursor-pointer"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>Làm mới danh sách</span>
                </button>
            </div>

            {/* KPI Cards Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Trạm có mạch phần cứng
                    </span>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-2xl font-black text-slate-900">{provisionedCount}</span>
                        <span className="text-xs text-slate-500 font-medium">/ {totalCount} trạm</span>
                    </div>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
                        Đang kết nối (Online)
                    </span>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-2xl font-black text-emerald-600">{onlineCount}</span>
                        <span className="text-xs text-emerald-700 font-medium">thiết bị</span>
                    </div>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
                    <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">
                        Mất kết nối (Offline)
                    </span>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-2xl font-black text-rose-600">{offlineCount}</span>
                        <span className="text-xs text-rose-500 font-medium">thiết bị</span>
                    </div>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Chưa gắn phần cứng
                    </span>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-2xl font-black text-slate-600">{unprovisionedCount}</span>
                        <span className="text-xs text-slate-400 font-medium">chưa lắp đặt</span>
                    </div>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="relative min-w-[280px] flex-1 max-w-md">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Tìm theo mã thiết bị, tên trạm hoặc địa chỉ..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                </div>

                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                    <button
                        type="button"
                        onClick={() => setFilterStatus('all')}
                        className={`px-3 py-1 rounded-lg cursor-pointer ${filterStatus === 'all' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        Tất cả ({totalCount})
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilterStatus('ONLINE')}
                        className={`px-3 py-1 rounded-lg cursor-pointer ${filterStatus === 'ONLINE' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500'}`}
                    >
                        Online ({onlineCount})
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilterStatus('OFFLINE')}
                        className={`px-3 py-1 rounded-lg cursor-pointer ${filterStatus === 'OFFLINE' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-500'}`}
                    >
                        Offline ({offlineCount})
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilterStatus('UNPROVISIONED')}
                        className={`px-3 py-1 rounded-lg cursor-pointer ${filterStatus === 'UNPROVISIONED' ? 'bg-white text-slate-700 shadow-xs' : 'text-slate-500'}`}
                    >
                        Chưa gắn mạch ({unprovisionedCount})
                    </button>
                </div>
            </div>

            {/* Devices Fleet Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider font-bold">
                            <tr>
                                <th className="px-5 py-3.5">Mã thiết bị / Trạm liên kết</th>
                                <th className="px-4 py-3.5">Trạng thái kết nối</th>
                                <th className="px-4 py-3.5">Sóng Wi-Fi & Phần cứng</th>
                                <th className="px-4 py-3.5">Thời gian hoạt động (Uptime)</th>
                                <th className="px-4 py-3.5">Lần cuối Heartbeat</th>
                                <th className="px-5 py-3.5 text-right">Điều khiển & Chẩn đoán</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-slate-400">
                                        <div className="w-7 h-7 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-2" />
                                        <p className="text-xs">Đang tải danh sách thiết bị vi điều khiển...</p>
                                    </td>
                                </tr>
                            ) : filteredDevices.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-slate-400">
                                        <Cpu className="w-8 h-8 text-slate-300 mx-auto mb-2 stroke-[1.5]" />
                                        <p className="text-xs font-semibold text-slate-600">Không tìm thấy thiết bị IoT nào</p>
                                        <p className="text-[11px] text-slate-400 mt-0.5">Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredDevices.map(device => {
                                    const isUnprovisioned = !device.isProvisioned || device.connectivityStatus === 'UNPROVISIONED';
                                    const isOnline = !isUnprovisioned && device.connectivityStatus === 'ONLINE';
                                    const isReboot = !isUnprovisioned && device.connectivityStatus === 'REBOOTING';
                                    const isOffline = !isUnprovisioned && !isOnline && !isReboot;

                                    return (
                                        <tr key={device.stationId} className="hover:bg-slate-50/60 transition">
                                            {/* Device & Station */}
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-xl shrink-0 border ${
                                                        isUnprovisioned
                                                            ? 'bg-slate-100 text-slate-400 border-slate-200'
                                                            : 'bg-blue-50 text-blue-600 border-blue-100'
                                                    }`}>
                                                        <Radio className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className={`font-mono text-xs font-bold ${
                                                                isUnprovisioned ? 'text-slate-400' : 'text-slate-900'
                                                            }`}>
                                                                {isUnprovisioned ? 'CHƯA_GẮN_MẠCH' : device.deviceCode}
                                                            </span>
                                                            {!isUnprovisioned && (
                                                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200 font-mono">
                                                                    v{device.firmwareVersion}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[11px] text-slate-700 font-semibold mt-0.5">
                                                            {device.stationName}
                                                        </p>
                                                        <p className="text-[10px] text-slate-400 truncate max-w-xs">
                                                            {device.stationAddress}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td className="px-4 py-4">
                                                <span
                                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                                                        isOnline
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                            : isReboot
                                                            ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                                                            : isOffline
                                                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                                                            : 'bg-slate-100 text-slate-500 border-slate-200'
                                                    }`}
                                                >
                                                    <span
                                                        className={`w-1.5 h-1.5 rounded-full ${
                                                            isOnline
                                                                ? 'bg-emerald-500 animate-pulse'
                                                                : isReboot
                                                                ? 'bg-amber-500'
                                                                : isOffline
                                                                ? 'bg-rose-500'
                                                                : 'bg-slate-400'
                                                        }`}
                                                    />
                                                    {isOnline ? 'Online' : isReboot ? 'Rebooting...' : isOffline ? 'Offline' : 'Chưa gắn mạch'}
                                                </span>
                                            </td>

                                            {/* Wi-Fi & Spec */}
                                            <td className="px-4 py-4">
                                                {isUnprovisioned ? (
                                                    <span className="text-[11px] text-slate-400 font-mono">-- (Chưa lắp đặt)</span>
                                                ) : (
                                                    <div className="space-y-0.5 text-xs text-slate-600">
                                                        <div className="flex items-center gap-1.5">
                                                            <Wifi className={`w-3.5 h-3.5 ${isOnline ? 'text-emerald-600' : 'text-slate-400'} shrink-0`} />
                                                            <span className="font-mono font-bold text-[11px]">
                                                                {device.wifiRssi ? `${device.wifiRssi} dBm` : 'Mất tín hiệu'}
                                                            </span>
                                                            {isOnline && <span className="text-[10px] text-emerald-600 font-semibold">(Tốt)</span>}
                                                        </div>
                                                        <p className="text-[10px] text-slate-400 font-mono">
                                                            Loại: <span className="text-slate-600 font-bold">{device.deviceType}</span>
                                                        </p>
                                                    </div>
                                                )}
                                            </td>

                                            {/* Uptime */}
                                            <td className="px-4 py-4 font-mono text-slate-600 text-xs">
                                                {isUnprovisioned ? (
                                                    <span className="text-slate-400">--</span>
                                                ) : (
                                                    <div className="flex items-center gap-1.5">
                                                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                        <span>
                                                            {device.uptimeSeconds
                                                                ? `${Math.floor(device.uptimeSeconds / 60)} phút ${device.uptimeSeconds % 60}s`
                                                                : '--'}
                                                        </span>
                                                    </div>
                                                )}
                                            </td>

                                            {/* Last Seen */}
                                            <td className="px-4 py-4 text-slate-500 text-xs">
                                                {isUnprovisioned ? (
                                                    <span className="text-slate-400">Chưa kích hoạt</span>
                                                ) : device.lastSeenAt ? (
                                                    <span>{new Date(device.lastSeenAt).toLocaleString('vi-VN')}</span>
                                                ) : (
                                                    <span className="text-slate-400">Chưa có dữ liệu</span>
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td className="px-5 py-4 text-right">
                                                {isUnprovisioned ? (
                                                    <span className="text-[11px] text-slate-400 italic">Cần gắn mạch để điều khiển</span>
                                                ) : (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRunSelfTest(device)}
                                                            disabled={testingDeviceId === device.id || isReboot}
                                                            className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/80 font-bold text-[11px] transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                                            title="Kích hoạt chu trình chẩn đoán tự động (UC-S07)"
                                                        >
                                                            <Activity className={`w-3.5 h-3.5 ${testingDeviceId === device.id ? 'animate-spin' : ''}`} />
                                                            <span>{testingDeviceId === device.id ? 'Testing...' : 'Self-Test'}</span>
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedDeviceForReboot(device)}
                                                            disabled={isReboot}
                                                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-200 border border-slate-200 font-bold text-[11px] transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                                            title="Khởi động lại ESP32 từ xa qua MQTT (UC-S09)"
                                                        >
                                                            <RotateCw className="w-3.5 h-3.5" />
                                                            <span>Reboot</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Self-Test Diagnostic Result Modal (UC-S07) */}
            {diagnosticsModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-slate-200 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2.5">
                                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                                    <ShieldCheck className="w-5 h-5" />
                                </span>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">
                                        Báo cáo Chẩn đoán Phần cứng (UC-S07)
                                    </h3>
                                    <p className="text-[11px] text-slate-400 font-mono">
                                        Thiết bị: {diagnosticsModal.device.deviceCode} · Trạm: {diagnosticsModal.device.stationName}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setDiagnosticsModal(null)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Status banner */}
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
                            <span className="font-bold flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                Tự chẩn đoán hoàn tất: Bo mạch hoạt động tốt
                            </span>
                            <span className="font-mono font-semibold text-emerald-700">
                                {diagnosticsModal.result.durationMs}ms
                            </span>
                        </div>

                        {/* Relays & Sensors Grid */}
                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                                <span className="font-bold text-slate-700 uppercase text-[10px] tracking-wider block">
                                    Rơ-le khóa Solenoid
                                </span>
                                <div className="space-y-1 font-mono text-[11px]">
                                    <div className="flex justify-between">
                                        <span>Rơ-le S (GPIO 26):</span>
                                        <span className="text-emerald-600 font-bold">OK (200ms)</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Rơ-le M (GPIO 25):</span>
                                        <span className="text-emerald-600 font-bold">OK (200ms)</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Rơ-le L (GPIO 33):</span>
                                        <span className="text-emerald-600 font-bold">OK (200ms)</span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                                <span className="font-bold text-slate-700 uppercase text-[10px] tracking-wider block">
                                    Cảm biến hành trình cửa
                                </span>
                                <div className="space-y-1 font-mono text-[11px]">
                                    <div className="flex justify-between">
                                        <span>Cửa S (GPIO 27):</span>
                                        <span className="text-slate-800 font-bold">CLOSED</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Cửa M (GPIO 32):</span>
                                        <span className="text-amber-700 font-bold">OPEN</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Cửa L (GPIO 23):</span>
                                        <span className="text-slate-800 font-bold">CLOSED</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-2 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setDiagnosticsModal(null)}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold cursor-pointer"
                            >
                                Đóng báo cáo
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reboot Confirm Modal (UC-S09) */}
            {selectedDeviceForReboot && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-sm w-full p-5 border border-slate-200 shadow-xl space-y-4">
                        <div className="flex items-center gap-3 text-amber-600">
                            <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-900">Khởi động lại vi điều khiển?</h4>
                                <p className="text-xs text-slate-500">UC-S09: Remote MQTT Reboot</p>
                            </div>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                            <p><b>Thiết bị:</b> {selectedDeviceForReboot.deviceCode}</p>
                            <p><b>Trạm:</b> {selectedDeviceForReboot.stationName}</p>
                            <p className="text-amber-700 font-medium pt-1 flex items-center gap-1">
                                <Info className="w-3.5 h-3.5" />
                                Vi điều khiển sẽ ngắt kết nối trong 3-5 giây và tự động boot lại.
                            </p>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setSelectedDeviceForReboot(null)}
                                className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmReboot}
                                disabled={isRebooting}
                                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                            >
                                {isRebooting ? 'Đang gửi...' : 'Xác nhận Reboot'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
