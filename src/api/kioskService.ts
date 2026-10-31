import apiClient from './client';
import type { CreateBookingResponse } from './bookingService';

export interface KioskCheckInRequest {
  stationId: string;
  credentialType: 'QR' | 'ACCESS_CODE';
  payload: string;
}

export interface KioskCheckInResponse {
  sessionToken?: string;
  bookingId: string;
  bookingCode: string;
  lockerId: string;
  lockerCode: string;
  lockerSize: string;
  doorState: string;
  message: string;
}

export interface KioskCheckOutRequest {
  sessionToken?: string;
  stationId: string;
  credentialType: 'QR' | 'ACCESS_CODE';
  payload: string;
}

export interface KioskCheckOutResponse {
  sessionToken?: string;
  bookingId: string;
  bookingCode: string;
  lockerId?: string;
  lockerCode?: string;
  lockerSize?: string;
  isOverdue: boolean;
  overdueFee: number;
  checkoutUrl?: string;
  doorState?: string;
  message: string;
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
  payOverdue: async (data: KioskCheckOutRequest & { bookingId: string }) =>
    (await apiClient.post<{ success: boolean; data: CreateBookingResponse; message?: string }>('/api/kiosk/pay-overdue', data)).data,
  syncPayment: async (orderCode: number) =>
    (await apiClient.post<{ success: boolean; data: { status: string; isSuccess: boolean } }>(`/api/Payments/sync/${orderCode}`)).data,
  operationStatus: async (data: {stationId: string; bookingId: string; sessionToken: string}) => {
    return (await apiClient.post<{success: boolean; data: {operation: string; complete: boolean; doorState: string; manualReviewPending: boolean}}>('/api/kiosk/operation-status', data)).data;
  },
  checkIn: async (data: KioskCheckInRequest) => {
    const res = await apiClient.post<{ success: boolean; data: KioskCheckInResponse; message?: string }>('/api/kiosk/check-in', data);
    return res.data;
  },

  checkOut: async (data: KioskCheckOutRequest) => {
    const res = await apiClient.post<{ success: boolean; data: KioskCheckOutResponse; message?: string }>('/api/kiosk/check-out', data);
    return res.data;
  },

  manualConfirm: async (data: KioskManualConfirmRequest) => {
    const res = await apiClient.post<{ success: boolean; data: boolean; message?: string }>('/api/kiosk/manual-confirm', data);
    return res.data;
  },

  getStationStatus: async (stationId: string) => {
    const res = await apiClient.get<{ success: boolean; data: KioskStationStatus }> (`/api/kiosk/station/${stationId}/status`);
    return res.data;
  },

  getStations: async () => {
    const res = await apiClient.get<{ success: boolean; data: { items?: Array<{ id: string; name: string; address: string }> } | Array<{ id: string; name: string; address: string }> }>('/api/stations');
    return res.data;
  }
};
