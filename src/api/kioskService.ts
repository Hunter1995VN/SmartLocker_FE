import apiClient from './client';

export interface KioskCheckInRequest {
  stationId: string;
  credentialType: 'QR' | 'ACCESS_CODE';
  payload: string;
}

export interface KioskCheckInResponse {
  bookingId: string;
  bookingCode: string;
  lockerId: string;
  lockerCode: string;
  lockerSize: string;
  doorState: string;
  message: string;
}

export interface KioskCheckOutRequest {
  stationId: string;
  credentialType: 'QR' | 'ACCESS_CODE';
  payload: string;
}

export interface KioskCheckOutResponse {
  bookingId: string;
  bookingCode: string;
  lockerId?: string;
  lockerCode?: string;
  lockerSize?: string;
  isOverdue: boolean;
  overdueHours?: number;
  overdueFeePerHour?: number;
  overdueFee: number;
  checkoutUrl?: string;
  qrCode?: string;
  accountNumber?: string;
  accountName?: string;
  bin?: string;
  orderCode?: number;
  paymentExpiresAt?: string;
  doorState?: string;
  message: string;
}

export interface KioskOverduePaymentRequest {
  bookingId?: string;
  bookingCode?: string;
  stationId?: string;
}

export interface KioskOverduePaymentResponse {
  bookingId: string;
  bookingCode: string;
  overdueHours: number;
  overdueFeePerHour: number;
  amount: number;
  paymentUrl: string;
  paymentExpiresAt: string;
  qrCode?: string;
  accountNumber?: string;
  accountName?: string;
  bin?: string;
  orderCode: number;
}

export interface KioskManualConfirmRequest {
  stationId: string;
  bookingId: string;
  lockerId: string;
  photoBase64?: string;
  notes?: string;
}

export interface KioskLockerItem {
  lockerId: string;
  lockerCode: string;
  size: string;
  businessStatus: string;
  healthStatus: string;
  doorState: string;
}

export interface KioskStationStatus {
  stationId: string;
  stationName: string;
  stationAddress: string;
  connectivityStatus: string;
  lockers: KioskLockerItem[];
}

export const kioskApi = {
  checkIn: async (data: KioskCheckInRequest) => {
    const res = await apiClient.post<{ success: boolean; data: KioskCheckInResponse; message?: string }>('/api/kiosk/check-in', data);
    return res.data;
  },

  checkOut: async (data: KioskCheckOutRequest) => {
    const res = await apiClient.post<{ success: boolean; data: KioskCheckOutResponse; message?: string }>('/api/kiosk/check-out', data);
    return res.data;
  },

  payOverdue: async (data: KioskOverduePaymentRequest) => {
    const res = await apiClient.post<{ success: boolean; data: KioskOverduePaymentResponse; message?: string }>('/api/kiosk/pay-overdue', data);
    return res.data;
  },

  confirmOverduePayment: async (data: KioskOverduePaymentRequest) => {
    const res = await apiClient.post<{ success: boolean; data: boolean; message?: string }>('/api/kiosk/confirm-overdue-payment', data);
    return res.data;
  },

  syncPayment: async (orderCode: number | string) => {
    const res = await apiClient.post<{ success: boolean; data: any; message?: string }>(`/api/payments/sync/${orderCode}`);
    return res.data;
  },

  manualConfirm: async (data: KioskManualConfirmRequest) => {
    const res = await apiClient.post<{ success: boolean; data: boolean; message?: string }>('/api/kiosk/manual-confirm', data);
    return res.data;
  },

  getStationStatus: async (stationId: string) => {
    const res = await apiClient.get<{ success: boolean; data: KioskStationStatus }>(`/api/kiosk/station/${stationId}/status`);
    return res.data;
  },

  getStations: async () => {
    const res = await apiClient.get<{ success: boolean; data: { items?: Array<{ id: string; name: string; address: string }> } | Array<{ id: string; name: string; address: string }> }>('/api/stations');
    return res.data;
  }
};
