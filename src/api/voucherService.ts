import apiClient from './client';
import type { ApiResponse } from './bookingService';

export interface VoucherItem {
  id: string;
  code: string;
  title: string;
  description?: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  maxDiscountAmount?: number;
  minOrderAmount: number;
  usageLimit: number;
  usedCount: number;
  remainingUses: number;
  startDate: string;
  endDate: string;
  isEligible: boolean;
  estimatedDiscount: number;
  ineligibleReason?: string;
}

export interface ValidateVoucherResponse {
  isValid: boolean;
  code: string;
  title: string;
  description?: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  maxDiscountAmount?: number;
  minOrderAmount: number;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  message: string;
}

export const getAvailableVouchers = async (
  orderAmount: number = 0
): Promise<VoucherItem[]> => {
  const res = await apiClient.get<ApiResponse<VoucherItem[]>>('/api/Vouchers/available', {
    params: { orderAmount }
  });
  return res.data?.data || [];
};

export const validateVoucherCode = async (
  code: string,
  orderAmount: number,
  stationId?: string,
  size?: string
): Promise<ApiResponse<ValidateVoucherResponse>> => {
  const res = await apiClient.post<ApiResponse<ValidateVoucherResponse>>(
    '/api/Vouchers/validate',
    { code, orderAmount, stationId, size }
  );
  return res.data;
};

/** Tính toán nhanh mức giảm giá theo công thức chuẩn của UC-T18 */
export const computeVoucherDiscount = (
  voucher: Pick<VoucherItem, 'discountType' | 'discountValue' | 'maxDiscountAmount' | 'minOrderAmount'>,
  orderAmount: number
): { isEligible: boolean; discountAmount: number; finalAmount: number; reason?: string } => {
  if (orderAmount < voucher.minOrderAmount) {
    return {
      isEligible: false,
      discountAmount: 0,
      finalAmount: orderAmount,
      reason: `Đơn tối thiểu ${voucher.minOrderAmount.toLocaleString('vi-VN')} VND`
    };
  }

  let rawDiscount = 0;
  if (voucher.discountType === 'PERCENTAGE') {
    rawDiscount = Math.round(orderAmount * (voucher.discountValue / 100));
    if (voucher.maxDiscountAmount && voucher.maxDiscountAmount > 0) {
      rawDiscount = Math.min(rawDiscount, voucher.maxDiscountAmount);
    }
  } else {
    rawDiscount = voucher.discountValue;
  }

  const maxAllowed = Math.max(0, orderAmount - 2000);
  const discountAmount = Math.min(rawDiscount, maxAllowed);
  const finalAmount = Math.max(2000, orderAmount - discountAmount);

  return {
    isEligible: true,
    discountAmount,
    finalAmount
  };
};

