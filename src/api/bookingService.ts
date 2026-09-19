import apiClient from './client';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: string[];
}

export interface CreateBookingRequest {
  stationId: string;
  size: 'S' | 'M' | 'L';
  startAt: string;
  endAt: string;
}

export interface CreateBookingResponse {
  bookingId: string;
  bookingCode: string;
  amount: number;
  paymentUrl: string;
  paymentExpiresAt: string;
}

export interface BookingDetailDto {
  id: string;
  bookingCode: string;
  stationId: string;
  stationName: string;
  lockerId?: string;
  lockerCode?: string;
  size: string;
  status: string;
  startAt: string;
  endAt: string;
  baseAmount: number;
  totalAmount: number;
  paymentUrl?: string;
  paymentExpiresAt?: string;
  isOverdue: boolean;
  overdueAmount: number;
  accessCode?: string;
  qrPayload?: string;
}

export interface BookingListResponse {
  items: BookingDetailDto[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface ExtendBookingRequest {
  additionalHours: number;
}

export interface CancelBookingRequest {
  reason: string;
}

export const createBooking = async (data: CreateBookingRequest): Promise<ApiResponse<CreateBookingResponse>> => {
  const response = await apiClient.post<ApiResponse<CreateBookingResponse>>('/api/bookings', data);
  return response.data;
};

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
  const response = await apiClient.get<ApiResponse<BookingListResponse>>(`/api/bookings/my${queryString}`);
  return response.data;
};

export const getBookingById = async (id: string): Promise<ApiResponse<BookingDetailDto>> => {
  const response = await apiClient.get<ApiResponse<BookingDetailDto>>(`/api/bookings/${id}`);
  return response.data;
};

export const extendBooking = async (id: string, data: ExtendBookingRequest): Promise<ApiResponse<any>> => {
  const response = await apiClient.post<ApiResponse<any>>(`/api/bookings/${id}/extend`, data);
  return response.data;
};

export const cancelBooking = async (id: string, data: CancelBookingRequest): Promise<ApiResponse<any>> => {
  const response = await apiClient.post<ApiResponse<any>>(`/api/bookings/${id}/cancel`, data);
  return response.data;
};

export const payOverdueFee = async (id: string): Promise<ApiResponse<any>> => {
  const response = await apiClient.post<ApiResponse<any>>(`/api/bookings/${id}/pay-overdue`);
  return response.data;
};
