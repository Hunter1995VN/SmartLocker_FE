import apiClient from './client';

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
  passcode?: string;
  durationHours?: number;
  holdExpiresAt?: string;
}

/** Item gọn cho danh sách (GET /api/Bookings/my) */
export interface BookingListItemDto {
  id: string;
  bookingCode: string;
  stationName: string;
  stationAddress?: string;
  lockerCode?: string;
  accessCode?: string;
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
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

// ─── Backward compatibility alias ────────────────────────────────────────────
// Một số page cũ import BookingDetailDto — alias sang BookingDto mới
export type BookingDetailDto = BookingDto;

// ─── API Functions ───────────────────────────────────────────────────────────

/**
 * Tạo lượt đặt tủ mới.
 * POST /api/Bookings (JWT required)
 */
export const createBooking = async (
  data: CreateBookingRequest
): Promise<ApiResponse<CreateBookingResponse>> => {
  const response = await apiClient.post<ApiResponse<CreateBookingResponse>>('/api/Bookings', data);
  return response.data;
};

/**
 * Lấy danh sách đơn đặt của user đang đăng nhập (phân trang & lọc status).
 * GET /api/Bookings/my?status=...&page=...&pageSize=...
 */
export const getMyBookings = async (
  status?: string,
  page?: number,
  pageSize?: number
): Promise<ApiResponse<BookingListResponse>> => {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (page !== undefined) params.append('page', page.toString());
  if (pageSize !== undefined) params.append('pageSize', pageSize.toString());

  const queryString = params.toString() ? `?${params.toString()}` : '';
  const response = await apiClient.get<ApiResponse<BookingListResponse>>(`/api/Bookings/my${queryString}`);
  return response.data;
};

/**
 * Lấy chi tiết đơn đặt theo ID.
 * GET /api/Bookings/{id}
 */
export const getBookingById = async (
  id: string
): Promise<ApiResponse<BookingDto>> => {
  const response = await apiClient.get<ApiResponse<BookingDto>>(`/api/Bookings/${id}`);
  return response.data;
};

/**
 * Gia hạn thời gian thuê tủ.
 * POST /api/Bookings/{id}/extend
 * Backend sẽ tạo link PayOS mới để thanh toán phí gia hạn.
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
 * Hủy đơn đặt tủ.
 * POST /api/Bookings/{id}/cancel
 * Backend tính toán hoàn tiền theo chính sách hủy.
 */
export const cancelBooking = async (
  id: string,
  data: CancelBookingRequest
): Promise<ApiResponse<BookingDto>> => {
  const response = await apiClient.post<ApiResponse<BookingDto>>(`/api/Bookings/${id}/cancel`, data);
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
