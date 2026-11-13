/**
 * Diễn giải lỗi đăng nhập Google thành thông báo có thể hành động.
 * Trước đây mọi lỗi đều hiển thị "Đăng nhập Google bị hủy" nên không biết nguyên nhân thật.
 */
export function describeGoogleOAuthError(err?: { error?: string; error_description?: string }): string {
    switch (err?.error) {
        case 'access_denied':
            return 'Bạn đã từ chối cấp quyền cho SmartLocker. Hãy thử lại và chọn "Cho phép".';
        case 'invalid_client':
        case 'unauthorized_client':
            return 'Cấu hình đăng nhập Google chưa đúng (client ID không hợp lệ). Vui lòng liên hệ quản trị viên.';
        case 'redirect_uri_mismatch':
        case 'origin_mismatch':
            return `Tên miền ${window.location.origin} chưa được cho phép trong Google Cloud (Authorized JavaScript origins). Vui lòng liên hệ quản trị viên.`;
        case 'immediate_failed':
            return 'Phiên Google chưa sẵn sàng. Hãy thử lại.';
        default:
            return err?.error_description
                ? `Đăng nhập Google thất bại: ${err.error_description}`
                : 'Đăng nhập Google thất bại. Vui lòng thử lại hoặc dùng email và mật khẩu.';
    }
}

export function describeGoogleNonOAuthError(err?: { type?: string }): string {
    switch (err?.type) {
        case 'popup_failed_to_open':
            return 'Trình duyệt đã chặn cửa sổ đăng nhập Google. Hãy cho phép cửa sổ bật lên (pop-up) cho trang này rồi thử lại.';
        case 'popup_closed':
            return 'Bạn đã đóng cửa sổ đăng nhập Google trước khi hoàn tất.';
        default:
            return 'Không mở được đăng nhập Google. Vui lòng thử lại.';
    }
}
