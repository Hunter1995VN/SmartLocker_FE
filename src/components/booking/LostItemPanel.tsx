import { useEffect, useRef, useState } from 'react';
import {
  PackageSearch,
  BellRing,
  CheckCircle2,
  Clock,
  Upload,
  X,
  Send,
  AlertCircle,
  MessageSquareText,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';
import apiClient from '../../api/client';
import { useT } from '../../i18n';

interface LostReportItem {
  id: string;
  description: string;
  status: string;
  staffResponse?: string;
}

interface State {
  lostReports: LostReportItem[];
  notifications: { id: string; title: string; body: string }[];
}

const REPORT_STATUS_MAP: Record<string, { label: string; cls: string }> = {
  OPEN: { label: 'Đang chờ kiểm tra', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  FOUND: { label: 'Đã tìm thấy đồ', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  RETURNED: { label: 'Đã bàn giao lại', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  NOT_FOUND: { label: 'Không tìm thấy', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  CLOSED: { label: 'Đã đóng yêu cầu', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
};

export default function LostItemPanel({
  bookingId,
  status,
  checkedOutAt,
}: {
  bookingId: string;
  status: string;
  checkedOutAt?: string | null;
}) {
  const t = useT();
  const eligible = ['COMPLETED', 'COMPLETED_MANUAL'].includes(status);
  const base = `/api/bookings/${bookingId}/support`;
  const activeBase = useRef(base);
  activeBase.current = base;
  const photoVersion = useRef(0);

  const [data, setData] = useState<State>();
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<string>();
  const [photoError, setPhotoError] = useState('');
  const [readingPhoto, setReadingPhoto] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccessMsg, setIsSuccessMsg] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let disposed = false,
      pending = false;
    setData(undefined);
    setDescription('');
    setPhoto(undefined);
    setPhotoError('');
    setMessage('');
    setIsSuccessMsg(false);
    setBusy(false);
    photoVersion.current++;
    setReadingPhoto(false);

    const load = async () => {
      if (!eligible || pending) return;
      pending = true;
      try {
        const response = await apiClient.get<State>(base);
        if (!disposed) setData(response.data);
      } catch {
        if (!disposed) {
          setIsSuccessMsg(false);
          setMessage(t('Không tải được yêu cầu tìm đồ.'));
        }
      } finally {
        pending = false;
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 15000);
    return () => {
      disposed = true;
      window.clearInterval(timer);
      photoVersion.current++;
    };
  }, [base, eligible, t]);

  if (!eligible) return null;

  const checkout = checkedOutAt
    ? Date.parse(/Z|[+-]\d\d:\d\d$/.test(checkedOutAt) ? checkedOutAt : checkedOutAt + 'Z')
    : NaN;
  const withinWindow =
    Number.isFinite(checkout) && Date.now() >= checkout && Date.now() - checkout <= 7 * 86400000;
  const loaded = data && Array.isArray(data.lostReports);
  const activeReport = data?.lostReports?.some((report) => ['OPEN', 'FOUND'].includes(report.status));

  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    const requestedBase = base;
    setBusy(true);
    setMessage('');
    setIsSuccessMsg(false);
    try {
      await action();
      const response = await apiClient.get<State>(requestedBase);
      if (activeBase.current === requestedBase) setData(response.data);
    } catch (error) {
      if (activeBase.current === requestedBase) {
        setIsSuccessMsg(false);
        setMessage(
          (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
            t('Không lưu được yêu cầu. Vui lòng thử lại.')
        );
      }
    } finally {
      if (activeBase.current === requestedBase) setBusy(false);
    }
  };

  return (
    <section
      className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden"
      aria-label={t('Tìm đồ thất lạc')}
    >
      {/* Card Header */}
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200/70 text-amber-600 flex items-center justify-center shrink-0">
            <PackageSearch className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
              {t('Tìm đồ thất lạc')}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Hỗ trợ tìm kiếm vật dụng bỏ quên tại ngăn tủ trong vòng 7 ngày sau khi trả tủ.
            </p>
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-6 space-y-5">
        {/* Status / Alert Message */}
        {message && (
          <div
            role="status"
            className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl text-xs sm:text-sm font-medium border ${
              isSuccessMsg
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}
          >
            {isSuccessMsg ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{message}</span>
          </div>
        )}

        {/* Loading State */}
        {!data && !message && (
          <div className="flex items-center gap-2.5 text-sm text-slate-500 py-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span>{t('Đang tải yêu cầu…')}</span>
          </div>
        )}

        {/* Notifications */}
        {data?.notifications && data.notifications.length > 0 && (
          <div className="space-y-2.5">
            {data.notifications.map((item) => (
              <article
                key={item.id}
                className="border border-blue-200/80 bg-blue-50/70 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                    <BellRing className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{item.title}</h3>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{item.body}</p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await apiClient.post(`${base}/notifications/${item.id}/read`);
                    })
                  }
                  className="shrink-0 px-3.5 py-1.5 rounded-xl bg-white border border-blue-200 text-blue-700 hover:bg-blue-100/70 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                >
                  {t('Đánh dấu đã đọc')}
                </button>
              </article>
            ))}
          </div>
        )}

        {/* Window / Active Notices */}
        {!withinWindow && (
          <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-slate-600 text-xs sm:text-sm">
            <Clock className="w-4 h-4 text-slate-400 shrink-0" />
            <span>{t('Chỉ gửi báo quên đồ trong 7 ngày sau khi lấy đồ.')}</span>
          </div>
        )}

        {activeReport && (
          <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-blue-50/60 border border-blue-200/70 text-blue-800 text-xs sm:text-sm font-medium">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{t('Yêu cầu đang được xử lý hoặc chờ bàn giao. Theo dõi phản hồi bên dưới.')}</span>
          </div>
        )}

        {data && !loaded && (
          <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs sm:text-sm">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{t('Chức năng tìm đồ chưa sẵn sàng. Vui lòng tải lại sau.')}</span>
          </div>
        )}

        {/* Report Form */}
        {withinWindow && loaded && !activeReport && (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (readingPhoto || photoError) return;
              void run(async () => {
                await apiClient.post(`${base}/lost-items`, { description, photo });
                if (activeBase.current === base) {
                  setDescription('');
                  setPhoto(undefined);
                  setIsSuccessMsg(true);
                  setMessage(t('Đã gửi yêu cầu tìm đồ.'));
                }
              });
            }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Description Column */}
              <div className="lg:col-span-7 flex flex-col">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2 block">
                  {t('Mô tả đồ vật')} <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={5}
                  maxLength={2000}
                  placeholder="Ví dụ: Tôi bỏ quên 1 tai nghe AirPods Pro vỏ trắng hoặc ví da màu đen ở góc trong cùng của tủ..."
                  className="w-full flex-1 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 focus:outline-none p-3.5 text-sm text-slate-800 placeholder:text-slate-400 transition resize-none"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
                <div className="mt-1.5 text-right text-[11px] text-slate-400">
                  {description.length} / 2000 ký tự
                </div>
              </div>

              {/* Photo Upload Column */}
              <div className="lg:col-span-5 flex flex-col">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2 block">
                  {t('Ảnh minh họa JPEG (tối đa 500 KB)')}
                </label>

                {!photo ? (
                  <label className="flex-1 min-h-[140px] flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 bg-slate-50/50 rounded-2xl p-4 text-center cursor-pointer transition">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                      {readingPhoto ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Upload className="w-5 h-5" />
                      )}
                    </div>
                    <span className="text-xs font-semibold text-slate-700">
                      {readingPhoto ? 'Đang xử lý ảnh...' : 'Nhấn để chọn ảnh minh họa'}
                    </span>
                    <span className="text-[11px] text-slate-400 mt-1">
                      Chỉ hỗ trợ ảnh .JPG / .JPEG (≤ 500 KB)
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg"
                      disabled={busy}
                      className="hidden"
                      onChange={(event) => {
                        const version = ++photoVersion.current;
                        const file = event.target.files?.[0];
                        setPhoto(undefined);
                        setPhotoError('');
                        setReadingPhoto(false);
                        if (!file) return;
                        if (file.type !== 'image/jpeg' || file.size > 500000) {
                          setPhotoError(
                            t('Chọn JPEG tối đa 500 KB, hoặc bỏ chọn ảnh để tiếp tục.')
                          );
                          return;
                        }
                        setReadingPhoto(true);
                        const reader = new FileReader();
                        reader.onload = () => {
                          if (photoVersion.current === version) {
                            setPhoto(String(reader.result));
                            setReadingPhoto(false);
                          }
                        };
                        reader.onerror = () => {
                          if (photoVersion.current === version) {
                            setPhotoError(t('Không đọc được ảnh. Chọn lại ảnh.'));
                            setReadingPhoto(false);
                          }
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                ) : (
                  <div className="relative rounded-2xl border border-slate-200 overflow-hidden bg-slate-100 group">
                    <img
                      loading="lazy"
                      decoding="async"
                      className="w-full h-40 object-cover"
                      src={photo}
                      alt={t('Ảnh minh họa sẽ gửi')}
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2.5 flex items-center justify-between text-white text-xs">
                      <span className="flex items-center gap-1 font-medium">
                        <ImageIcon className="w-3.5 h-3.5" /> Ảnh đính kèm
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setPhoto(undefined);
                          setPhotoError('');
                        }}
                        className="px-2 py-1 rounded-lg bg-white/20 hover:bg-rose-600 text-white text-[11px] font-semibold backdrop-blur-sm transition flex items-center gap-1 cursor-pointer"
                      >
                        <X className="w-3 h-3" /> Xóa
                      </button>
                    </div>
                  </div>
                )}

                {photoError && (
                  <p role="alert" className="mt-2 text-xs text-rose-600 font-medium flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {photoError}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={busy || readingPhoto || !!photoError}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm px-5 py-2.5 rounded-xl shadow-sm shadow-blue-600/20 transition cursor-pointer"
              >
                {busy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {busy ? t('Đang gửi…') : t('Gửi báo quên đồ')}
              </button>
            </div>
          </form>
        )}

        {/* Submitted Reports List */}
        {data?.lostReports && data.lostReports.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Lịch sử yêu cầu đã gửi ({data.lostReports.length})
            </h3>
            <div className="space-y-3">
              {data.lostReports.map((report) => {
                const statusInfo = REPORT_STATUS_MAP[report.status] || {
                  label: report.status,
                  cls: 'bg-slate-100 text-slate-700 border-slate-200',
                };
                return (
                  <article
                    key={report.id}
                    className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-500">
                        {t('Trạng thái:')}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusInfo.cls}`}
                      >
                        {statusInfo.label}
                      </span>
                    </div>

                    <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line">
                      {report.description}
                    </p>

                    {report.staffResponse && (
                      <div className="bg-white border border-blue-100 rounded-xl p-3.5 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700">
                          <MessageSquareText className="w-3.5 h-3.5" />
                          {t('Nhân viên:')}
                        </div>
                        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                          {report.staffResponse}
                        </p>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
