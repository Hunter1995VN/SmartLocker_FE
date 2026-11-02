/**
 * AD-FE-09: Thiết lập Chiến dịch Khuyến mại, Mã Voucher & Ngân sách Chiết khấu
 * Kết nối với:
 * - AdminPromotionsController (/api/admin/promotions)
 * - VouchersController (/api/vouchers)
 */
import apiClient from './client';

export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data?: T;
    errors?: string[];
}

export interface GlobalPromotionBudgetDto {
    monthlyBudgetCap: number;
    warningThresholdPercent: number;
    maxDiscountPercentPerOrder: number;
    minPayableAmountAfterDiscount: number;
    autoPauseOnBudgetExhausted: boolean;
    monthlyBudgetSpent: number;
    monthlyBudgetRemaining: number;
    utilizationPercent: number;
    budgetAlertStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'EXHAUSTED' | string;
    updatedAt: string;
}

export interface UpdateGlobalPromotionBudgetRequest {
    monthlyBudgetCap: number;
    warningThresholdPercent: number;
    maxDiscountPercentPerOrder: number;
    minPayableAmountAfterDiscount: number;
    autoPauseOnBudgetExhausted: boolean;
    reason?: string;
}

export type CampaignCategory = 'NEW_USER' | 'SEASONAL' | 'PARTNER' | 'LONG_STAY' | 'FLASH_SALE';

export interface PromotionCampaignDto {
    id: string;
    code: string;
    name: string;
    description: string;
    category: CampaignCategory | string;
    allocatedBudget: number;
    spentBudget: number;
    remainingBudget: number;
    utilizationPercent: number;
    voucherCount: number;
    activeVoucherCount: number;
    totalRedemptions: number;
    startDate: string;
    endDate: string;
    isPaused: boolean;
    autoPauseWhenDepleted: boolean;
    status: 'ACTIVE' | 'PAUSED' | 'SCHEDULED' | 'ENDED' | 'BUDGET_EXHAUSTED' | string;
    createdAt: string;
    updatedAt: string;
}

export interface UpsertPromotionCampaignRequest {
    code: string;
    name: string;
    description: string;
    category: string;
    allocatedBudget: number;
    startDate: string;
    endDate: string;
    isPaused: boolean;
    autoPauseWhenDepleted: boolean;
    reason?: string;
}

export interface UpdateCampaignStatusRequest {
    isPaused: boolean;
    topUpBudgetAmount?: number;
    reason?: string;
}

export type DiscountType = 'PERCENTAGE' | 'FIXED';

export interface VoucherAdminDto {
    id: string;
    code: string;
    title: string;
    description?: string;
    campaignId: string;
    campaignName: string;
    discountType: DiscountType | string;
    discountValue: number;
    maxDiscountAmount?: number;
    minOrderAmount: number;
    usageLimit: number;
    usedCount: number;
    remainingUses: number;
    perUserLimit: number;
    budgetCap: number;
    budgetSpent: number;
    budgetRemaining: number;
    budgetUtilizationPercent: number;
    applicableSizes: string[];
    applicableStationIds: string[];
    startDate: string;
    endDate: string;
    isActive: boolean;
    effectiveStatus:
        | 'ACTIVE'
        | 'PAUSED'
        | 'CAMPAIGN_PAUSED'
        | 'SCHEDULED'
        | 'EXPIRED'
        | 'LIMIT_REACHED'
        | 'BUDGET_EXHAUSTED'
        | string;
    createdAt: string;
    updatedAt: string;
}

export interface UpsertVoucherRequest {
    code: string;
    title: string;
    description?: string;
    campaignId?: string;
    discountType: DiscountType;
    discountValue: number;
    maxDiscountAmount?: number;
    minOrderAmount: number;
    usageLimit: number;
    perUserLimit: number;
    budgetCap?: number;
    applicableSizes?: string[];
    applicableStationIds?: string[];
    startDate: string;
    endDate: string;
    isActive: boolean;
    reason?: string;
}

export interface ValidateVoucherRequest {
    code: string;
    orderAmount: number;
    stationId?: string;
    size?: string;
}

export interface VoucherValidationResultDto {
    isValid: boolean;
    voucherId?: string;
    code: string;
    title: string;
    campaignId: string;
    campaignName: string;
    discountType: string;
    discountValue: number;
    maxDiscountAmount?: number;
    originalAmount: number;
    discountAmount: number;
    finalPayableAmount: number;
    voucherBudgetRemainingAfter: number;
    campaignBudgetRemainingAfter: number;
    message: string;
}

export interface AvailableVoucherItemDto {
    id: string;
    code: string;
    title: string;
    description?: string;
    campaignName: string;
    discountType: string;
    discountValue: number;
    maxDiscountAmount?: number;
    minOrderAmount: number;
    remainingUses: number;
    endDate: string;
    isEligibleNow: boolean;
    estimatedDiscount: number;
    finalPayableAmount: number;
    ineligibleReason?: string;
}

export interface PromotionLedgerItemDto {
    id: number;
    eventType: string;
    voucherCode: string;
    campaignName: string;
    bookingCode?: string;
    actorEmail: string;
    actorRole: string;
    originalAmount: number;
    discountAmount: number;
    finalAmount: number;
    summary: string;
    createdAt: string;
}

export interface PromotionDashboardOverviewDto {
    globalBudget: GlobalPromotionBudgetDto;
    totalCampaigns: number;
    activeCampaigns: number;
    totalVouchers: number;
    activeVouchers: number;
    totalRedemptionsCount: number;
    totalDiscountGranted: number;
    totalGmvDriven: number;
    averageDiscountPerOrder: number;
    roiMultiple: number;
    campaigns: PromotionCampaignDto[];
    vouchers: VoucherAdminDto[];
    recentLedger: PromotionLedgerItemDto[];
}

export const adminPromotionService = {
    async getOverview(): Promise<ApiResponse<PromotionDashboardOverviewDto>> {
        const res = await apiClient.get<ApiResponse<PromotionDashboardOverviewDto>>(
            '/api/admin/promotions/overview'
        );
        return res.data;
    },

    async getVouchers(params?: {
        search?: string;
        campaignId?: string;
        status?: string;
    }): Promise<ApiResponse<VoucherAdminDto[]>> {
        const query = new URLSearchParams();
        if (params?.search?.trim()) query.set('search', params.search.trim());
        if (params?.campaignId?.trim()) query.set('campaignId', params.campaignId.trim());
        if (params?.status?.trim()) query.set('status', params.status.trim());
        const url = `/api/admin/promotions/vouchers${query.toString() ? `?${query.toString()}` : ''}`;
        const res = await apiClient.get<ApiResponse<VoucherAdminDto[]>>(url);
        return res.data;
    },

    async updateBudgetPolicy(
        body: UpdateGlobalPromotionBudgetRequest
    ): Promise<ApiResponse<GlobalPromotionBudgetDto>> {
        const res = await apiClient.put<ApiResponse<GlobalPromotionBudgetDto>>(
            '/api/admin/promotions/budget-policy',
            body
        );
        return res.data;
    },

    async createCampaign(
        body: UpsertPromotionCampaignRequest
    ): Promise<ApiResponse<PromotionCampaignDto>> {
        const res = await apiClient.post<ApiResponse<PromotionCampaignDto>>(
            '/api/admin/promotions/campaigns',
            body
        );
        return res.data;
    },

    async updateCampaign(
        campaignId: string,
        body: UpsertPromotionCampaignRequest
    ): Promise<ApiResponse<PromotionCampaignDto>> {
        const res = await apiClient.put<ApiResponse<PromotionCampaignDto>>(
            `/api/admin/promotions/campaigns/${encodeURIComponent(campaignId)}`,
            body
        );
        return res.data;
    },

    async updateCampaignStatus(
        campaignId: string,
        body: UpdateCampaignStatusRequest
    ): Promise<ApiResponse<PromotionCampaignDto>> {
        const res = await apiClient.patch<ApiResponse<PromotionCampaignDto>>(
            `/api/admin/promotions/campaigns/${encodeURIComponent(campaignId)}/status`,
            body
        );
        return res.data;
    },

    async createVoucher(body: UpsertVoucherRequest): Promise<ApiResponse<VoucherAdminDto>> {
        const res = await apiClient.post<ApiResponse<VoucherAdminDto>>(
            '/api/admin/promotions/vouchers',
            body
        );
        return res.data;
    },

    async updateVoucher(
        voucherId: string,
        body: UpsertVoucherRequest
    ): Promise<ApiResponse<VoucherAdminDto>> {
        const res = await apiClient.put<ApiResponse<VoucherAdminDto>>(
            `/api/admin/promotions/vouchers/${voucherId}`,
            body
        );
        return res.data;
    },

    async toggleVoucher(
        voucherId: string,
        isActive: boolean,
        reason?: string
    ): Promise<ApiResponse<VoucherAdminDto>> {
        const res = await apiClient.patch<ApiResponse<VoucherAdminDto>>(
            `/api/admin/promotions/vouchers/${voucherId}/toggle`,
            { isActive, reason }
        );
        return res.data;
    },

    async deleteVoucher(voucherId: string, reason?: string): Promise<ApiResponse<boolean>> {
        const query = new URLSearchParams();
        if (reason?.trim()) query.set('reason', reason.trim());
        const url = `/api/admin/promotions/vouchers/${voucherId}${
            query.toString() ? `?${query.toString()}` : ''
        }`;
        const res = await apiClient.delete<ApiResponse<boolean>>(url);
        return res.data;
    },

    async simulateDiscount(
        body: ValidateVoucherRequest
    ): Promise<ApiResponse<VoucherValidationResultDto>> {
        const res = await apiClient.post<ApiResponse<VoucherValidationResultDto>>(
            '/api/admin/promotions/simulate',
            body
        );
        return res.data;
    },

    async getAvailableVouchers(params: {
        stationId?: string;
        size?: string;
        orderAmount: number;
    }): Promise<ApiResponse<AvailableVoucherItemDto[]>> {
        const res = await apiClient.get<ApiResponse<AvailableVoucherItemDto[]>>(
            '/api/vouchers/available',
            { params }
        );
        return res.data;
    },

    async validateVoucher(
        body: ValidateVoucherRequest
    ): Promise<ApiResponse<VoucherValidationResultDto>> {
        const res = await apiClient.post<ApiResponse<VoucherValidationResultDto>>(
            '/api/vouchers/validate',
            body
        );
        return res.data;
    },
};

export default adminPromotionService;
