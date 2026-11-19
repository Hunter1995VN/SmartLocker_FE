import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ShieldCheck,
  Check,
  X,
} from 'lucide-react';
import adminRefundService, { type AdminRefundDto } from '../../../api/adminRefundService';
import Pagination from '../Pagination';

export default function AdminRefundsManagementView() {
  const [refunds, setRefunds] = useState<AdminRefundDto[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const formatVnd = (val: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.round(val)) + ' VND';
  };

  const fetchRefunds = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await adminRefundService.getRefundRequests(
        statusFilter || undefined,
        page,
        10
      );
      if (res.success && res.data) {
        setRefunds(res.data.items);
        setTotalCount(res.data.totalCount);
      }
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    fetchRefunds();
  }, [fetchRefunds]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleApprove = async (paymentId: string, bookingCode: string) => {
    if (!window.confirm(`Approve refund for booking #${bookingCode}?`)) return;
    setActionInProgressId(paymentId);
    try {
      const res = await adminRefundService.approveRefund(paymentId, 'Approved by admin operator');
      if (res.success) {
        showToast(`Refund approved for #${bookingCode}`);
        await fetchRefunds();
      } else {
        showToast(res.message || 'Failed to approve refund', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Error approving refund', 'error');
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleReject = async (paymentId: string, bookingCode: string) => {
    const note = window.prompt(`Enter rejection reason for booking #${bookingCode}:`);
    if (note === null) return;
    setActionInProgressId(paymentId);
    try {
      const res = await adminRefundService.rejectRefund(paymentId, note || 'Rejected by admin');
      if (res.success) {
        showToast(`Refund rejected for #${bookingCode}`);
        await fetchRefunds();
      } else {
        showToast(res.message || 'Failed to reject refund', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Error rejecting refund', 'error');
    } finally {
      setActionInProgressId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMsg && (
        <div className={`p-4 rounded-xl flex items-center gap-2 text-xs font-bold border shadow-sm ${
          toastMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {toastMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-red-600" />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Duyệt yêu cầu hoàn tiền (UC-T20)</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kiểm tra các yêu cầu hủy đơn của khách, duyệt hoặc từ chối yêu cầu hoàn tiền PayOS tự động.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="PENDING">Chờ duyệt</option>
            <option value="PAID">Đã duyệt &amp; hoàn tiền</option>
            <option value="FAILED">Đã từ chối</option>
          </select>

          <button
            onClick={() => fetchRefunds()}
            disabled={isLoading}
            className="h-9 px-3 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Đơn đặt chỗ / Mã tham chiếu</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Trạm &amp; ngăn tủ</th>
                <th className="py-3 px-4">Số tiền hoàn</th>
                <th className="py-3 px-4">Lý do / Chính sách</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                    <p className="font-medium">Đang tải yêu cầu hoàn tiền...</p>
                  </td>
                </tr>
              ) : refunds.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <ShieldCheck className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">Không có yêu cầu hoàn tiền</p>
                    <p className="text-xs">Không có yêu cầu hoàn tiền nào khớp với bộ lọc hiện tại.</p>
                  </td>
                </tr>
              ) : (
                refunds.map((ref) => {
                  const isPending = ref.status === 'PENDING';
                  const isApproved = ref.status === 'PAID';
                  const isRejected = ref.status === 'FAILED';

                  return (
                    <tr key={ref.paymentId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-slate-900 block">#{ref.bookingCode}</span>
                        <span className="text-xs text-slate-500 font-mono block">{ref.orderCode}</span>
                        <span className="text-xs text-slate-500 block mt-0.5">
                          {new Date(ref.requestedAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-900 block">{ref.userFullName}</span>
                        <span className="text-xs text-slate-500 block">{ref.userEmail}</span>
                        {ref.userPhoneNumber && (
                          <span className="text-xs text-slate-500 block">{ref.userPhoneNumber}</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-800 block truncate max-w-[180px]">{ref.stationName}</span>
                        <span className="text-xs text-slate-500 font-mono block">{ref.lockerCode}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-mono font-extrabold text-rose-600 text-sm block">
                          {formatVnd(ref.refundAmount)}
                        </span>
                        <span className="text-xs text-slate-500 block">
                          Paid: {formatVnd(ref.originalAmount)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 max-w-[200px]">
                        <span className="text-slate-700 block truncate font-medium" title={ref.cancellationReason}>
                          {ref.cancellationReason || 'No reason specified'}
                        </span>
                        <span className="text-xs text-slate-500 block">
                          Policy: {ref.cancelPolicyRate ? `${ref.cancelPolicyRate * 100}% Refund` : 'Custom'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          isApproved
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : isPending
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-600'
                        }`}>
                          {isPending && <Clock className="w-3 h-3 animate-spin text-amber-600" />}
                          {isApproved && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                          {isRejected && <XCircle className="w-3 h-3 text-slate-500" />}
                          <span>{isApproved ? 'Đã duyệt' : isPending ? 'Chờ duyệt' : 'Đã từ chối'}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleApprove(ref.paymentId, ref.bookingCode)}
                              disabled={actionInProgressId === ref.paymentId}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                              title="Duyệt hoàn tiền"
                            >
                              <Check className="w-3 h-3" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => handleReject(ref.paymentId, ref.bookingCode)}
                              disabled={actionInProgressId === ref.paymentId}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                              title="Từ chối hoàn tiền"
                            >
                              <X className="w-3 h-3" />
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 italic">Hoàn tất</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="px-4 pb-3 border-t border-slate-100">
          <Pagination
            page={page}
            totalPages={Math.max(1, Math.ceil(totalCount / 10))}
            total={totalCount}
            from={totalCount === 0 ? 0 : (page - 1) * 10 + 1}
            to={Math.min(page * 10, totalCount)}
            onPageChange={setPage}
            label="yêu cầu hoàn tiền"
          />
        </div>
      </div>
    </div>
  );
}

