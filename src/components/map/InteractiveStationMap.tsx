import { useEffect, useRef, useState } from 'react';
import {
    MapPin, Navigation, Clock, Phone, ArrowRight, ExternalLink, Layers, Sparkles, X, LocateFixed
} from 'lucide-react';
import type { Station } from '../../api/stationService';

interface InteractiveStationMapProps {
    stations: Station[];
    selectedStation: Station | null;
    userLocation: { lat: number; lng: number } | null;
    center: { lat: number; lng: number };
    zoom: number;
    radiusKm?: number | null;
    onSelectStation: (station: Station | null) => void;
    onViewDetail: (station: Station) => void;
    onBookStation: (station: Station) => void;
    onChangeUserLocation?: (loc: { lat: number; lng: number }) => void;
}

type MapStyleKey = 'osm' | 'esriStreet' | 'satellite';

// 100% Free Map Tile Servers — Không bao giờ yêu cầu API Key
const TILE_LAYERS: Record<MapStyleKey, { label: string; url: string; attribution: string }> = {
    osm: {
        label: 'Bản đồ Đường phố',
        url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; OpenStreetMap contributors',
    },
    esriStreet: {
        label: 'Giao thông (HD)',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
        attribution: '&copy; Esri, HERE, Garmin, OpenStreetMap',
    },
    satellite: {
        label: 'Vệ tinh',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: '&copy; Esri',
    },
};

declare global {
    interface Window {
        L?: any;
    }
}

function loadLeafletAssets(): Promise<any> {
    if (window.L) return Promise.resolve(window.L);

    return new Promise((resolve, reject) => {
        if (!document.getElementById('leaflet-css-cdn')) {
            const link = document.createElement('link');
            link.id = 'leaflet-css-cdn';
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);
        }

        const existingScript = document.getElementById('leaflet-js-cdn') as HTMLScriptElement | null;
        if (existingScript) {
            existingScript.addEventListener('load', () => resolve(window.L));
            existingScript.addEventListener('error', reject);
            return;
        }

        const script = document.createElement('script');
        script.id = 'leaflet-js-cdn';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.async = true;
        script.onload = () => resolve(window.L);
        script.onerror = () => {
            const fallback = document.createElement('script');
            fallback.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js';
            fallback.async = true;
            fallback.onload = () => resolve(window.L);
            fallback.onerror = reject;
            document.head.appendChild(fallback);
        };
        document.head.appendChild(script);
    });
}

export default function InteractiveStationMap({
    stations,
    selectedStation,
    userLocation,
    center,
    zoom,
    radiusKm,
    onSelectStation,
    onViewDetail,
    onBookStation,
    onChangeUserLocation,
}: InteractiveStationMapProps) {
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapInstanceRef = useRef<any>(null);
    const tileLayerRef = useRef<any>(null);
    const markersLayerRef = useRef<any>(null);
    const userLayerRef = useRef<any>(null);
    const routeLayerRef = useRef<any>(null);

    const [leafletReady, setLeafletReady] = useState<boolean>(Boolean(window.L));
    const [leafletError, setLeafletError] = useState<boolean>(false);
    const [mapStyle, setMapStyle] = useState<MapStyleKey>('osm');
    const [pickLocationMode, setPickLocationMode] = useState<boolean>(false);
    const pickModeRef = useRef<boolean>(false);

    useEffect(() => {
        pickModeRef.current = pickLocationMode;
    }, [pickLocationMode]);

    // 1. Load Leaflet library
    useEffect(() => {
        let mounted = true;
        loadLeafletAssets()
            .then(() => {
                if (mounted) setLeafletReady(true);
            })
            .catch(() => {
                if (mounted) setLeafletError(true);
            });
        return () => {
            mounted = false;
        };
    }, []);

    // 2. Initialize Map instance
    useEffect(() => {
        if (!leafletReady || !mapContainerRef.current || mapInstanceRef.current) return;
        const L = window.L;
        if (!L) return;

        const map = L.map(mapContainerRef.current, {
            center: [center.lat, center.lng],
            zoom: zoom,
            zoomControl: false,
        });

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        const cfg = TILE_LAYERS[mapStyle];
        tileLayerRef.current = L.tileLayer(cfg.url, {
            maxZoom: 19,
            attribution: cfg.attribution,
        }).addTo(map);

        routeLayerRef.current = L.layerGroup().addTo(map);
        userLayerRef.current = L.layerGroup().addTo(map);
        markersLayerRef.current = L.layerGroup().addTo(map);

        map.on('click', (e: any) => {
            if (pickModeRef.current && onChangeUserLocation) {
                onChangeUserLocation({ lat: e.latlng.lat, lng: e.latlng.lng });
                setPickLocationMode(false);
                return;
            }
            onSelectStation(null);
        });

        mapInstanceRef.current = map;

        setTimeout(() => {
            map.invalidateSize();
        }, 150);

        return () => {
            map.remove();
            mapInstanceRef.current = null;
        };
    }, [leafletReady]);

    // 3. Switch tile layer style
    useEffect(() => {
        const L = window.L;
        const map = mapInstanceRef.current;
        if (!L || !map) return;

        if (tileLayerRef.current) {
            map.removeLayer(tileLayerRef.current);
        }
        const cfg = TILE_LAYERS[mapStyle];
        tileLayerRef.current = L.tileLayer(cfg.url, {
            maxZoom: 19,
            attribution: cfg.attribution,
        }).addTo(map);
    }, [mapStyle, leafletReady]);

    // 4. Update center & zoom when parent changes them
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;
        map.flyTo([center.lat, center.lng], zoom, { duration: 0.65 });
    }, [center.lat, center.lng, zoom]);

    // 5. Render user GPS location & radius circle (Draggable pin!)
    useEffect(() => {
        const L = window.L;
        const userLayer = userLayerRef.current;
        if (!L || !userLayer) return;

        userLayer.clearLayers();
        if (!userLocation) return;

        // Radius circle
        const circleRadius = radiusKm && radiusKm > 0 ? radiusKm * 1000 : 600;
        L.circle([userLocation.lat, userLocation.lng], {
            radius: circleRadius,
            color: '#ef4444',
            weight: 1.5,
            dashArray: radiusKm ? '6, 6' : undefined,
            fillColor: '#ef4444',
            fillOpacity: 0.08,
        }).addTo(userLayer);

        const userHtml = `
            <div style="display:flex;flex-direction:column;align-items:center;cursor:grab;">
                <div style="background:#dc2626;color:#ffffff;padding:3px 9px;border-radius:9999px;font-family:'Plus Jakarta Sans',sans-serif;font-size:11px;font-weight:800;white-space:nowrap;border:2px solid #ffffff;box-shadow:0 4px 12px rgba(220,38,38,0.45);display:flex;align-items:center;gap:4px;">
                    <span>📍</span>
                    <span>Vị trí của bạn</span>
                </div>
                <div style="width:16px;height:16px;border-radius:9999px;background:#dc2626;border:3px solid #ffffff;box-shadow:0 0 0 5px rgba(220,38,38,0.28);margin-top:2px;"></div>
            </div>
        `;

        const userIcon = L.divIcon({
            html: userHtml,
            className: 'smartlocker-user-gps-pin',
            iconSize: [120, 44],
            iconAnchor: [60, 36],
        });

        const userMarker = L.marker([userLocation.lat, userLocation.lng], {
            icon: userIcon,
            draggable: Boolean(onChangeUserLocation),
            zIndexOffset: 1200,
        });

        userMarker.bindTooltip(
            '<div style="font-family:sans-serif;font-size:11px;font-weight:700;">Kéo thả ghim này hoặc bấm "Đặt vị trí của tôi" để chọn vị trí</div>',
            { direction: 'top', offset: [0, -32] }
        );

        userMarker.on('dragend', (e: any) => {
            const pos = e.target.getLatLng();
            if (pos && onChangeUserLocation) {
                onChangeUserLocation({ lat: pos.lat, lng: pos.lng });
            }
        });

        userMarker.addTo(userLayer);
    }, [userLocation, radiusKm, leafletReady, onChangeUserLocation]);

    // 6. Render route line between userLocation and selectedStation
    useEffect(() => {
        const L = window.L;
        const routeLayer = routeLayerRef.current;
        if (!L || !routeLayer) return;

        routeLayer.clearLayers();
        if (!userLocation || !selectedStation) return;

        const latlngs = [
            [userLocation.lat, userLocation.lng],
            [Number(selectedStation.latitude), Number(selectedStation.longitude)],
        ];

        // Outer glow line
        L.polyline(latlngs, {
            color: '#2563eb',
            weight: 6,
            opacity: 0.2,
        }).addTo(routeLayer);

        // Inner dashed line
        L.polyline(latlngs, {
            color: '#2563eb',
            weight: 3,
            dashArray: '8, 8',
            opacity: 0.9,
        }).addTo(routeLayer);

        // Midpoint distance badge
        if (selectedStation.distanceKm != null) {
            const midLat = (userLocation.lat + Number(selectedStation.latitude)) / 2;
            const midLng = (userLocation.lng + Number(selectedStation.longitude)) / 2;
            const dText = selectedStation.distanceKm < 1
                ? `${Math.round(selectedStation.distanceKm * 1000)}m`
                : `${selectedStation.distanceKm.toFixed(1)} km`;

            const badgeIcon = L.divIcon({
                html: `<div style="background:#0b1c30;color:#ffffff;padding:2px 8px;border-radius:9999px;font-size:10px;font-weight:700;white-space:nowrap;border:1.5px solid #ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.25);">🧭 Cách bạn ${dText}</div>`,
                className: 'smartlocker-route-badge',
                iconSize: [100, 22],
                iconAnchor: [50, 11],
            });
            L.marker([midLat, midLng], { icon: badgeIcon, interactive: false }).addTo(routeLayer);
        }
    }, [userLocation, selectedStation, leafletReady]);

    // 7. Render station markers from real DB data
    useEffect(() => {
        const L = window.L;
        const map = mapInstanceRef.current;
        const markersLayer = markersLayerRef.current;
        if (!L || !map || !markersLayer) return;

        markersLayer.clearLayers();

        stations.forEach((station) => {
            if (station.latitude == null || station.longitude == null) return;
            const isSelected = selectedStation?.id === station.id;
            const isActive = station.status === 'ACTIVE';
            const totalAvail = (station.availableS ?? 0) + (station.availableM ?? 0) + (station.availableL ?? 0);

            const bg = !isActive
                ? '#64748b'
                : isSelected
                    ? '#1d4ed8'
                    : totalAvail > 0
                        ? '#2563eb'
                        : '#d97706';

            const scale = isSelected ? 'transform:scale(1.15);' : '';
            const ring = isSelected
                ? 'box-shadow:0 0 0 4px rgba(37,99,235,0.35),0 6px 16px rgba(15,23,42,0.32);'
                : 'box-shadow:0 4px 10px rgba(15,23,42,0.25);';

            const pinHtml = `
                <div style="display:flex;flex-direction:column;align-items:center;transition:all 0.2s ease;${scale}">
                    <div style="background:${bg};color:#ffffff;padding:4px 10px;border-radius:9999px;font-family:'Plus Jakarta Sans',sans-serif;font-size:11px;font-weight:800;white-space:nowrap;border:2px solid #ffffff;display:flex;align-items:center;gap:4px;${ring}">
                        <span>🔒</span>
                        <span>${isActive ? `${totalAvail} trống` : 'Bảo trì'}</span>
                    </div>
                    <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:7px solid ${bg};margin-top:-1px;"></div>
                </div>
            `;

            const icon = L.divIcon({
                html: pinHtml,
                className: 'smartlocker-station-pin',
                iconSize: [96, 38],
                iconAnchor: [48, 36],
            });

            const marker = L.marker([Number(station.latitude), Number(station.longitude)], {
                icon,
                zIndexOffset: isSelected ? 1000 : 500,
            });

            marker.bindTooltip(
                `<div style="font-family:'Plus Jakarta Sans',sans-serif;font-weight:700;font-size:12px;color:#0b1c30;">${station.name}</div>`,
                { direction: 'top', offset: [0, -34] }
            );

            marker.on('click', (e: any) => {
                L.DomEvent.stopPropagation(e);
                onSelectStation(station);
            });

            marker.addTo(markersLayer);
        });
    }, [stations, selectedStation, leafletReady]);

    const distLabel = selectedStation?.distanceKm != null
        ? selectedStation.distanceKm < 1
            ? `${Math.round(selectedStation.distanceKm * 1000)}m`
            : `${selectedStation.distanceKm.toFixed(1)}km`
        : null;

    const minPrice = selectedStation
        ? Math.min(
            ...[selectedStation.priceS, selectedStation.priceM, selectedStation.priceL]
                .filter((p): p is number => p != null && p > 0)
        )
        : null;

    if (leafletError) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-[#f0f4ff] p-6">
                <div className="bg-white rounded-2xl p-6 shadow-md max-w-sm text-center border border-[#e5eeff]">
                    <MapPin className="w-10 h-10 text-[#2563eb] mx-auto mb-3" />
                    <p className="font-bold text-[#0b1c30] text-sm">Không thể tải lớp bản đồ trực tuyến</p>
                    <p className="text-xs text-[#737686] mt-1">Vui lòng kiểm tra kết nối mạng Internet để tải bản đồ số.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`w-full h-full relative overflow-hidden bg-[#e8f0fe] ${pickLocationMode ? 'cursor-crosshair' : ''}`}>
            {/* Map Canvas */}
            <div ref={mapContainerRef} className="w-full h-full z-0" />

            {/* Banner hướng dẫn khi đang ở chế độ chọn vị trí trên bản đồ */}
            {pickLocationMode && (
                <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[450] bg-[#dc2626] text-white px-4 py-2 rounded-full shadow-lg text-xs font-bold flex items-center gap-2 animate-bounce">
                    <LocateFixed className="w-4 h-4" />
                    <span>Nhấp vào bất kỳ điểm nào trên bản đồ để đặt "Vị trí của bạn"</span>
                    <button
                        type="button"
                        onClick={() => setPickLocationMode(false)}
                        className="ml-1 bg-white/20 hover:bg-white/30 rounded-full p-0.5 cursor-pointer"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* Loading overlay while Leaflet initializes */}
            {!leafletReady && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#f0f4ff]/90">
                    <div className="text-center">
                        <div className="w-11 h-11 border-4 border-[#2563eb] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-sm text-[#0b1c30] font-semibold">Đang khởi tạo bản đồ số GPS...</p>
                    </div>
                </div>
            )}

            {/* Map Style Switcher & Pick Location Button (Bottom Left) */}
            <div className="absolute bottom-4 left-4 z-[400] flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1 bg-white/95 backdrop-blur-md p-1 rounded-xl shadow-[0_2px_12px_rgba(15,23,42,0.12)] border border-[#e5eeff]">
                    <Layers className="w-3.5 h-3.5 text-[#2563eb] ml-2 mr-1" />
                    {(Object.keys(TILE_LAYERS) as MapStyleKey[]).map((key) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setMapStyle(key)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                mapStyle === key
                                    ? 'bg-[#2563eb] text-white shadow-xs'
                                    : 'text-[#434655] hover:bg-[#eff4ff]'
                            }`}
                        >
                            {TILE_LAYERS[key].label}
                        </button>
                    ))}
                </div>

                {onChangeUserLocation && (
                    <button
                        type="button"
                        onClick={() => setPickLocationMode(v => !v)}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold shadow-[0_2px_12px_rgba(15,23,42,0.12)] border transition-all cursor-pointer flex items-center gap-1.5 ${
                            pickLocationMode
                                ? 'bg-[#dc2626] text-white border-[#dc2626]'
                                : 'bg-white/95 text-[#dc2626] border-[#fecaca] hover:bg-red-50'
                        }`}
                        title="Chọn vị trí hiện tại của bạn trực tiếp trên bản đồ"
                    >
                        <LocateFixed className="w-3.5 h-3.5" />
                        {pickLocationMode ? 'Đang chọn vị trí...' : 'Đặt vị trí của tôi trên bản đồ'}
                    </button>
                )}
            </div>

            {/* Selected Station Floating Info Card on Map */}
            {selectedStation && (
                <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-[450] w-[92%] max-w-[410px] bg-white rounded-2xl shadow-[0_10px_30px_rgba(15,23,42,0.22)] border border-[#dce9ff] p-4 animate-fade-in-up">
                    <button
                        type="button"
                        onClick={() => onSelectStation(null)}
                        className="absolute top-3 right-3 w-7 h-7 rounded-full bg-[#f0f4ff] hover:bg-[#e5eeff] flex items-center justify-center text-[#434655] cursor-pointer"
                        title="Đóng"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    <div className="pr-7">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                selectedStation.status === 'ACTIVE'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-amber-100 text-amber-700'
                            }`}>
                                {selectedStation.status === 'ACTIVE' ? '● Đang hoạt động' : '⚠ Bảo trì'}
                            </span>
                            {distLabel && (
                                <span className="text-[11px] font-bold text-[#dc2626] bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <Navigation className="w-3 h-3" /> Cách bạn {distLabel}
                                </span>
                            )}
                            {minPrice != null && Number.isFinite(minPrice) && (
                                <span className="text-[11px] font-bold text-[#007d55] bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" /> Từ {(minPrice / 1000).toFixed(0)}k/h
                                </span>
                            )}
                        </div>
                        <h3 className="font-bold text-[#0b1c30] text-base leading-snug">{selectedStation.name}</h3>
                        <p className="text-xs text-[#737686] mt-0.5 line-clamp-2 flex items-start gap-1">
                            <MapPin className="w-3.5 h-3.5 text-[#2563eb] shrink-0 mt-0.5" />
                            <span>{selectedStation.address}</span>
                        </p>
                    </div>

                    {/* Locker availability badges */}
                    <div className="grid grid-cols-3 gap-2 my-3">
                        {[
                            { k: 'S', label: 'Cỡ S', a: selectedStation.availableS ?? 0, t: selectedStation.totalS ?? 0, p: selectedStation.priceS },
                            { k: 'M', label: 'Cỡ M', a: selectedStation.availableM ?? 0, t: selectedStation.totalM ?? 0, p: selectedStation.priceM },
                            { k: 'L', label: 'Cỡ L', a: selectedStation.availableL ?? 0, t: selectedStation.totalL ?? 0, p: selectedStation.priceL },
                        ].map(({ k, label, a, t, p }) => (
                            <div
                                key={k}
                                className={`rounded-xl px-2.5 py-1.5 text-center border ${
                                    a > 0 ? 'bg-[#f8f9ff] border-[#dce9ff]' : 'bg-red-50/60 border-red-100'
                                }`}
                            >
                                <div className="text-[10px] font-bold text-[#737686] flex items-center justify-between">
                                    <span>{label}</span>
                                    {p != null && <span className="text-[#2563eb]">{(p / 1000).toFixed(0)}k/h</span>}
                                </div>
                                <div className={`text-sm font-extrabold mt-0.5 ${a > 0 ? 'text-[#0b1c30]' : 'text-red-500'}`}>
                                    {Math.min(t, a)}<span className="text-[11px] font-normal text-[#737686]">/{t} trống</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Hours & Phone */}
                    <div className="flex items-center justify-between text-xs text-[#434655] mb-3 px-1">
                        <span className="flex items-center gap-1 font-medium">
                            <Clock className="w-3.5 h-3.5 text-[#2563eb]" />
                            Giờ mở cửa: <strong>{selectedStation.opensAt || '00:00'} – {selectedStation.closesAt || '23:59'}</strong>
                        </span>
                        {selectedStation.contactPhone && (
                            <a
                                href={`tel:${selectedStation.contactPhone}`}
                                className="flex items-center gap-1 font-semibold text-[#2563eb] hover:underline"
                            >
                                <Phone className="w-3.5 h-3.5" /> {selectedStation.contactPhone}
                            </a>
                        )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => onViewDetail(selectedStation)}
                            className="flex-1 py-2.5 px-3 bg-[#eff4ff] hover:bg-[#dce9ff] text-[#2563eb] text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                            Xem thông tin trạm
                        </button>
                        <a
                            href={`https://www.google.com/maps/dir/?api=1&origin=${userLocation ? `${userLocation.lat},${userLocation.lng}` : ''}&destination=${selectedStation.latitude},${selectedStation.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-[#0b1c30] text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1"
                            title="Mở Google Maps dẫn đường từ vị trí của bạn"
                        >
                            <ExternalLink className="w-3.5 h-3.5 text-[#2563eb]" />
                            Chỉ đường
                        </a>
                        {selectedStation.status === 'ACTIVE' && (
                            <button
                                type="button"
                                onClick={() => onBookStation(selectedStation)}
                                className="flex-1 py-2.5 px-3 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer flex items-center justify-center gap-1"
                            >
                                Đặt tủ <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
