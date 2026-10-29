/**
 * Offline Ticket Store - Quản lý lưu trữ vé mở khóa ngoại tuyến trong LocalStorage
 * Hỗ trợ mở tủ kể cả khi thiết bị di động mất mạng hoặc trạm Kiosk mất kết nối đám mây.
 */

export interface OfflineTicketData {
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
  cachedAt: string;
  securityAlgorithm: string;
  instructions: string;
}

const STORAGE_KEY = 'smartlocker_offline_tickets_cache';

export const offlineTicketStore = {
  /**
   * Lưu vé mở khóa ngoại tuyến vào LocalStorage
   */
  saveTicket(ticket: Omit<OfflineTicketData, 'cachedAt'> & { cachedAt?: string }): void {
    try {
      const tickets = this.getAllTickets();
      // Loại bỏ bản ghi cũ cùng bookingId nếu có
      const filtered = tickets.filter(t => t.bookingId !== ticket.bookingId);
      filtered.push({
        ...ticket,
        isOfflineReady: ticket.isOfflineReady ?? true,
        cachedAt: ticket.cachedAt || new Date().toISOString()
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (err) {
      console.warn('Lỗi khi lưu vé ngoại tuyến vào LocalStorage:', err);
    }
  },

  /**
   * Lấy vé ngoại tuyến theo BookingId
   */
  getTicket(bookingId: string): OfflineTicketData | null {
    try {
      const tickets = this.getAllTickets();
      const ticket = tickets.find(t => t.bookingId === bookingId);
      if (!ticket) return null;
      return ticket;
    } catch {
      return null;
    }
  },

  /**
   * Lấy toàn bộ danh sách vé mở khóa ngoại tuyến đã lưu
   */
  getAllTickets(): OfflineTicketData[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as OfflineTicketData[];
    } catch {
      return [];
    }
  },

  /**
   * Xóa vé ngoại tuyến của đơn đặt chỗ
   */
  removeTicket(bookingId: string): void {
    try {
      const tickets = this.getAllTickets();
      const filtered = tickets.filter(t => t.bookingId !== bookingId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (err) {
      console.warn('Lỗi khi xóa vé ngoại tuyến:', err);
    }
  },

  /**
   * Kiểm tra vé ngoại tuyến còn hạn sử dụng hay không
   */
  isTicketValid(ticket: OfflineTicketData): boolean {
    try {
      const expiry = new Date(ticket.validUntil).getTime();
      return expiry > Date.now();
    } catch {
      return false;
    }
  },

  /**
   * Tự động xóa các vé đã quá hạn hơn 72 giờ
   */
  cleanExpiredTickets(): void {
    try {
      const tickets = this.getAllTickets();
      const cutoff = Date.now() - 72 * 3600 * 1000;
      const validTickets = tickets.filter(t => {
        const expiry = new Date(t.validUntil).getTime();
        return expiry > cutoff;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(validTickets));
    } catch {
      // Ignored
    }
  }
};
