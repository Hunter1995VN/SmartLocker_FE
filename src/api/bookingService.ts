import apiClient from './client';
import { offlineTicketStore } from '../utils/offlineTicketStore';

export async function upgradeOnlineTicket(bookingId: string): Promise<void> {
  await apiClient.post(`/api/bookings/${bookingId}/ticket/upgrade-pin`, { confirmReplaceLegacyCredential: true });
}

// ─── Common Response Wrapper ─────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: string[];
}

// ─── Request DTOs ────────────────────────────────────────────────────────────

export interface CreateBookingRequest {
  stationId: string;
  size: 'S' | 'M' | 'L';
  startAt: string;   // ISO 8601 datetime
  endAt: string;     // ISO 8601 datetime
  voucherCode?: string;
}

export interface ExtendBookingRequest {
  newEndAt: string;   // ISO 8601 datetime — mốc kết thúc mới
}

export interface CancelBookingRequest {
  reason?: string;
}

// ─── Response DTOs ───────────────────────────────────────────────────────────

export interface CreateBookingResponse {
  bookingId: string;
  bookingCode: string;
  originalAmount?: number;
  discountAmount?: number;
  voucherCode?: string;
  appliedVoucherCode?: string;
  amount: number;
  paymentUrl: string;
  paymentExpiresAt: string;
  qrCode?: string;
  accountNumber?: string;
  accountName?: string;
  bin?: string;
  orderCode?: number;
}

export interface PaymentDto {
  id: string;
  bookingId: string;
  kind: 'BASE' | 'EXTENSION' | 'OVERDUE' | 'REFUND';
  status: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'REFUNDED';
  amount: number;
  currency: string;
  orderCode: string;
  gateway?: string;
  paymentLink?: string;
  paidAt?: string;
  refundAmount?: number;
  refundedAt?: string;
  createdAt: string;
}

/** DTO vé mở khóa ngoại tuyến có chữ ký mật mã HMAC-SHA256 (JWS RFC 7515) */
export interface OfflineTicketDto {
  bookingId: string;
  bookingCode: string;
  stationId: string;
  stationName: string;
  stationAddress: string;
  lockerId?: string | null;
  lockerCode?: string | null;
  lockerSize: string;
  accessPin: string;
  offlineHmacToken: string;
  qrData: string;
  startAt: string;
  endAt: string;
  validUntil: string;
  isOfflineReady: boolean;
  securityAlgorithm: string;
  instructions: string;
}

/** Chi tiết đầy đủ 1 booking (GET /api/Bookings/{id}) */
export interface BookingDto {
  id: string;
  bookingCode: string;
  userId: string;
  stationId: string;
  stationName: string;
  stationAddress: string;
  lockerCode?: string;
  size: string;
  status: string;
  startAt: string;
  endAt: string;
  checkedInAt?: string;
  checkedOutAt?: string;
  baseAmount: number;
  isOverdue: boolean;
  overdueSince?: string;
  extensionCount: number;
  cancellationReason?: string;
  cancelPolicyRate?: number;
  createdAt: string;
  payments: PaymentDto[];
  currentOverdueFee?: number;
  overdueFeePerHour?: number;
  overdueHours?: number;
  gracePeriodMinutes?: number;
  estimatedRefundAmount?: number;
  hourlyRate?: number;
  maxHours?: number;
  canExtend: boolean;
  canCancel: boolean;
  accessCode?: string;
  qrPayload?: string;
  offlineHmacToken?: string;
  offlineExpiresAt?: string;
  isOfflineReady?: boolean;
  passcode?: string;
  durationHours?: number;
  holdExpiresAt?: string;
}

/** Item gọn cho danh sách (GET /api/Bookings/my) */
export interface BookingListItemDto {
  id: string;
  bookingCode: string;
  stationId?: string;
  stationName: string;
  stationAddress?: string;
  lockerCode?: string;
  accessCode?: string;
  offlineHmacToken?: string;
  isOfflineReady?: boolean;
  size: string;
  status: string;
  startAt: string;
  endAt: string;
  checkedInAt?: string;
  checkedOutAt?: string;
  holdExpiresAt?: string;
  baseAmount: number;
  hourlyRate?: number;
  maxHours?: number;
  isOverdue: boolean;
  overdueSince?: string;
  overdueHours?: number;
  overdueFeePerHour?: number;
  createdAt: string;
  currentOverdueFee?: number;
  canExtend?: boolean;
  canCancel?: boolean;
  passcode?: string;
  durationHours?: number;
  cancellationReason?: string;
  cancelPolicyRate?: number;
  payments?: PaymentDto[];
}

export interface BookingListResponse {
  items: BookingListItemDto[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CancelBookingResponse {
  bookingId: string;
  status: string;
  refundAmount?: number;
  refundPolicyRate?: number;
  cancellationReason?: string;
  refundStatus?: string;
  cancelledAt: string;
}

// ─── API Functions ────────────────────────────────────────────────────────────

/**
 * Tạo booking mới và nhận link thanh toán PayOS.
 * POST /api/Bookings
 */
export const createBooking = async (
  data: CreateBookingRequest
): Promise<ApiResponse<CreateBookingResponse>> => {
  const response = await apiClient.post<ApiResponse<CreateBookingResponse>>('/api/Bookings', data);
  return response.data;
};

/**
 * Lấy chi tiết booking theo ID.
 * GET /api/Bookings/{id}
 */
export const getBookingById = async (
  id: string
): Promise<ApiResponse<BookingDto>> => {
  const response = await apiClient.get<ApiResponse<BookingDto>>(`/api/Bookings/${id}`);
  return response.data;
};

/**
 * Lấy vé mở khóa ngoại tuyến có chữ ký HMAC-SHA256 (JWS RFC 7515).
 * Tự động đồng bộ vào local cache (offlineTicketStore) để mở tủ khi mất kết nối mạng.
 * GET /api/Bookings/{id}/offline-ticket
 */
export const getOfflineTicket = async (
  bookingId: string
): Promise<ApiResponse<OfflineTicketDto>> => {
  try {
    const response = await apiClient.get<ApiResponse<OfflineTicketDto>>(`/api/Bookings/${bookingId}/offline-ticket`);
    if (response.data && response.data.success && response.data.data) {
      offlineTicketStore.saveTicket({
        ...response.data.data,
        cachedAt: new Date().toISOString()
      });
    }
    return response.data;
  } catch (err: any) {
    const cached = offlineTicketStore.getTicket(bookingId);
    if (cached) {
      return {
        success: true,
        message: 'Đã tải vé mở khóa ngoại tuyến từ bộ nhớ máy (Offline Cache).',
        data: {
          ...cached,
          isOfflineReady: true
        }
      };
    }
    throw err;
  }
};

/**
 * Lấy danh sách booking của user hiện tại (My Bookings).
 * GET /api/Bookings/my
 */
export const getMyBookings = async (
  status?: string,
  page: number = 1,
  pageSize: number = 20
): Promise<ApiResponse<BookingListResponse>> => {
  const params: Record<string, any> = { page, pageSize };
  if (status && status !== 'ALL') {
    params.status = status;
  }
  const response = await apiClient.get<ApiResponse<BookingListResponse>>('/api/Bookings/my', { params });
  return response.data;
};

/**
 * Gia hạn thời gian thuê tủ.
 * POST /api/Bookings/{id}/extend
 * Backend tạo link PayOS mới cho khoản phụ phí gia hạn.
 */
export const extendBooking = async (
  id: string,
  data: ExtendBookingRequest
): Promise<ApiResponse<CreateBookingResponse>> => {
  const response = await apiClient.post<ApiResponse<CreateBookingResponse>>(`/api/Bookings/${id}/extend`, data);
  return response.data;
};

export interface CancelPreviewDto {
  bookingId: string;
  bookingCode: string;
  status: string;
  canCancel: boolean;
  paidAmount: number;
  refundRate: number;
  refundAmount: number;
  dailyCancellationCount: number;
  isDailyLimitExceeded: boolean;
  policyTier: string;
  policyDescription: string;
  reasonIfBlocked?: string;
}

/**
 * Xem trước chính sách hoàn tiền trước khi hủy đơn.
 * GET /api/Bookings/{id}/cancel-preview
 */
export const getCancelPreview = async (
  id: string
): Promise<ApiResponse<CancelPreviewDto>> => {
  const response = await apiClient.get<ApiResponse<CancelPreviewDto>>(`/api/Bookings/${id}/cancel-preview`);
  return response.data;
};

/**
 * Hủy booking và kích hoạt hoàn tiền (nếu đủ điều kiện theo chính sách).
 * POST /api/Bookings/{id}/cancel
 */
export const cancelBooking = async (
  id: string,
  data?: CancelBookingRequest
): Promise<ApiResponse<CancelBookingResponse>> => {
  const response = await apiClient.post<ApiResponse<CancelBookingResponse>>(`/api/Bookings/${id}/cancel`, data ?? {});
  return response.data;
};

/**
 * Thanh toán phí quá hạn (UC-T19).
 * POST /api/Bookings/{id}/pay-overdue
 * Backend tạo mã VietQR PayOS mới cho khoản phụ phí.
 */
export const payOverdueFee = async (
  id: string
): Promise<ApiResponse<CreateBookingResponse>> => {
  const response = await apiClient.post<ApiResponse<CreateBookingResponse>>(`/api/Bookings/${id}/pay-overdue`);
  return response.data;
};

/**
 * Giả lập trạng thái quá hạn cho đơn đang STORED hoặc CONFIRMED (Test UC-T19).
 * POST /api/Bookings/{id}/simulate-overdue?overdueHours=...
 */
export const simulateOverdue = async (
  id: string,
  overdueHours: number = 2
): Promise<ApiResponse<BookingDto>> => {
  const response = await apiClient.post<ApiResponse<BookingDto>>(`/api/Bookings/${id}/simulate-overdue?overdueHours=${overdueHours}`);
  return response.data;
};

/**
 * Xác nhận thanh toán phụ phí quá hạn nhanh (Demo/Test UC-T19).
 * POST /api/kiosk/confirm-overdue-payment
 */
export const confirmOverduePaymentDemo = async (
  bookingId: string,
  bookingCode?: string
): Promise<ApiResponse<boolean>> => {
  const response = await apiClient.post<ApiResponse<boolean>>('/api/kiosk/confirm-overdue-payment', {
    bookingId,
    bookingCode,
  });
  return response.data;
};

/**
 * Check-in / Mở tủ nhận chỗ tại Kiosk (bắt đầu tính giờ đặt tủ)
 * POST /api/Bookings/{id}/check-in
 */
export const checkInBooking = async (
  id: string
): Promise<ApiResponse<BookingDto>> => {
  const response = await apiClient.post<ApiResponse<BookingDto>>(`/api/Bookings/${id}/check-in`);
  return response.data;
};

/**
 * Check-out / Mở tủ lấy đồ và hoàn tất lưu trữ
 * POST /api/Bookings/{id}/check-out
 */
export const checkOutBooking = async (
  id: string
): Promise<ApiResponse<BookingDto>> => {
  const response = await apiClient.post<ApiResponse<BookingDto>>(`/api/Bookings/${id}/check-out`);
  return response.data;
};

/**
 * Chủ động đối soát & kích hoạt thanh toán từ PayOS
 * POST /api/payments/sync/{orderCode}
 */
export const syncPayment = async (
  orderCode: number | string
): Promise<ApiResponse<any>> => {
  const response = await apiClient.post<ApiResponse<any>>(`/api/payments/sync/${orderCode}`);
  return response.data;
};
