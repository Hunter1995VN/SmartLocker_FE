import apiClient from './client';

export interface StationReview {
  id: string;
  stars: number;
  comment: string;
  criteria: string;
  stationName: string;
  lockerSize: 'S' | 'M' | 'L';
  createdAt: string;
}

export interface PublicReview extends StationReview {
  isOwn: boolean;
  hasReported: boolean;
}

export interface AdminReview extends StationReview {
  bookingCode: string;
  isHidden: boolean;
  reports: number;
  pendingReports: number;
}

export interface ReviewReport {
  id: string;
  reason: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface ReviewPage<T> {
  items: T[];
  count: number;
  pageSize: number;
}

export type ReviewFilter = 'all' | 'reported' | 'visible' | 'hidden';

const publicPath = '/api/station-reviews';
const adminPath = '/api/admin/station-reviews';

export const stationReviewService = {
  async publicReviews(page: number, signal: AbortSignal) {
    const { data } = await apiClient.get<ReviewPage<PublicReview> & { average: number }>(publicPath, { params: { page }, signal });
    return data;
  },
  async report(id: string, reason: string) {
    await apiClient.post(`${publicPath}/${id}/reports`, { reason });
  },
  async adminReviews(status: ReviewFilter, page: number, signal: AbortSignal) {
    const { data } = await apiClient.get<ReviewPage<AdminReview>>(adminPath, { params: { status, page }, signal });
    return data;
  },
  async reports(id: string, page: number, signal: AbortSignal) {
    const { data } = await apiClient.get<ReviewPage<ReviewReport>>(`${adminPath}/${id}/reports`, { params: { page }, signal });
    return data;
  },
  async setVisibility(id: string, isHidden: boolean) {
    await apiClient.put(`${adminPath}/${id}/visibility`, { isHidden });
  },
  async resolve(id: string, reportId: string) {
    await apiClient.put(`${adminPath}/${id}/reports/${reportId}/resolve`);
  },
};
