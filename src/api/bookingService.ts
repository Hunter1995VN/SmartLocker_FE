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
  amount: number;
  paymentUrl: string;
  paymentExpiresAt: string;
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
  estimatedRefundAmount?: number;
  canExtend: boolean;
  canCancel: boolean;
  passcode?: string;
  durationHours?: number;
}

/** Item gọn cho danh sách (GET /api/Bookings/my) */
export interface BookingListItemDto {
  id: string;
  bookingCode: string;
  stationName: string;
  stationAddress?: string;
  lockerCode?: string;
  size: string;
  status: string;
  startAt: string;
  endAt: string;
  baseAmount: number;
  isOverdue: boolean;
  createdAt: string;
  currentOverdueFee?: number;
  canExtend?: boolean;
  passcode?: string;
  durationHours?: number;
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
 * Thanh toán phí quá hạn.
 * POST /api/Bookings/{id}/pay-overdue
 * Backend tạo link PayOS mới cho khoản phụ phí.
 */
export const payOverdueFee = async (
  id: string
): Promise<ApiResponse<CreateBookingResponse>> => {
  const response = await apiClient.post<ApiResponse<CreateBookingResponse>>(`/api/Bookings/${id}/pay-overdue`);
  return response.data;
};
