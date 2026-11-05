import type { KioskLanguage } from './kioskI18n';
const labels = {
 AVAILABLE:['Trống','Available','空き','이용 가능','空闲'], RESERVED:['Đã giữ chỗ','Reserved','予約済み','예약됨','已预订'],
 OCCUPIED:['Đang lưu đồ','Occupied','保管中','보관 중','存放中'], MAINTENANCE:['Bảo trì','Maintenance','点検中','점검 중','维护中'],
 DISABLED:['Vô hiệu hóa','Disabled','利用停止','사용 중지','已停用'],BLOCKED:['Tạm khóa','Blocked','一時停止','임시 잠금','暂时锁定'],
 UNKNOWN:['Chưa xác định','Unknown','不明','알 수 없음','未知'],UNMAPPED:['Chưa gắn thiết bị','Unmapped','機器未接続','장치 미연결','未绑定设备'],
 OPEN:['Mở','Open','開','열림','打开'],CLOSED:['Đóng','Closed','閉','닫힘','关闭'],
 ONLINE:['Kết nối','Online','接続中','온라인','在线'],OFFLINE:['Mất kết nối','Offline','未接続','오프라인','离线'],DEGRADED:['Kết nối một phần','Degraded','一部未接続','일부 연결 끊김','部分连接异常'],
 HEALTHY:['Bình thường','Healthy','正常','정상','正常'],WARNING:['Cần kiểm tra','Check required','要確認','확인 필요','需检查'],CRITICAL:['Lỗi nghiêm trọng','Critical fault','重大な故障','심각한 오류','严重故障'],
 FAULTY:['Lỗi','Faulty','故障','고장','故障'],SENSOR_ERROR:['Lỗi cảm biến','Sensor fault','センサー故障','센서 오류','传感器故障'],LOCK_ERROR:['Lỗi khóa','Lock fault','錠の故障','잠금장치 오류','门锁故障'],DOOR_STUCK:['Kẹt cửa','Door stuck','扉の不具合','문 끼임','柜门卡住'],
 PENDING_PAYMENT:['Chờ thanh toán','Awaiting payment','支払い待ち','결제 대기','待付款'],PENDING_CONFIRM:['Chờ xác minh','Awaiting confirmation','確認待ち','확인 대기','待确认'],
 CONFIRMED:['Đã đặt, chờ gửi','Booked, awaiting deposit','予約済み・預入待ち','예약 완료·보관 대기','已预订·待存放'],STORED:['Đang lưu đồ','Stored','保管中','보관 중','存放中'],
 COMPLETED:['Hoàn tất','Completed','完了','완료','已完成'],COMPLETED_MANUAL:['Nhân viên đã xác nhận','Staff confirmed','スタッフ確認済み','직원 확인 완료','工作人员已确认'],
 CANCELLED:['Đã hủy','Cancelled','キャンセル済み','취소됨','已取消'],EXPIRED:['Hết hạn','Expired','期限切れ','만료됨','已过期'],FAILED:['Thất bại','Failed','失敗','실패','失败'],NO_SHOW:['Quá hạn nhận tủ','Pickup window expired','預入期限切れ','보관 시작 기한 만료','超出存放时限'],ABANDONED:['Đồ quá hạn xử lý','Abandoned item handling','長期未受取品対応','장기 미수령 물품 처리','滞留物品处理中'],
} as const;
export function kioskStateLabel(lang:KioskLanguage,value:string):string { const index=['VI','EN','JA','KO','ZH'].indexOf(lang);return (labels[value as keyof typeof labels]||labels.UNKNOWN)[index]||labels.UNKNOWN[0]; }
export const kioskStateTranslations=labels;
