import { LayoutDashboard, KeyRound, CreditCard, Layers } from 'lucide-react'

function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-xl text-white shadow-sm">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">SmartLocker Management System</h1>
            <p className="text-xs text-slate-500 font-medium">Capstone Project SE42 • Clean Architecture & Feature-Based</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Backend API: https://localhost:7xxx
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto w-full px-6 py-12 flex-1">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl font-extrabold text-slate-900 mb-3 tracking-tight">
            Hệ Thống Quản Lý Tủ Đồ Thông Minh (SLMS)
          </h2>
          <p className="text-slate-600 leading-relaxed text-sm">
            Dự án đã hoàn tất thiết lập kiến trúc chuẩn: <strong>Backend .NET 8 Clean Architecture</strong> kết hợp <strong>Frontend React Feature-Based</strong>.
          </p>
        </div>

        {/* 3 Modules Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Card Quân */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
              <KeyRound className="w-6 h-6" />
            </div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-slate-900">Phân Hệ 1</h3>
              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-semibold">Quân</span>
            </div>
            <h4 className="font-semibold text-blue-600 text-sm mb-2">Identity & Access</h4>
            <ul className="text-xs text-slate-600 space-y-1.5 mb-6">
              <li>• Trang chủ & Khám phá bản đồ trạm</li>
              <li>• Đăng ký, Đăng nhập, Profile</li>
              <li>• Sinh mã QR Code & Access Code 8 số</li>
            </ul>
            <div className="text-xs font-mono bg-slate-100 p-2 rounded text-slate-600">
              features/auth & stations
            </div>
          </div>

          {/* Card Nhiệm */}
          <div className="bg-white border-2 border-blue-600/30 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative">
            <div className="absolute -top-3 right-4 px-3 py-0.5 bg-blue-600 text-white rounded-full text-[11px] font-bold uppercase tracking-wider">
              Core Billing
            </div>
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4">
              <CreditCard className="w-6 h-6" />
            </div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-slate-900">Phân Hệ 2</h3>
              <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded font-semibold">Nhiệm</span>
            </div>
            <h4 className="font-semibold text-indigo-600 text-sm mb-2">Booking & Payment</h4>
            <ul className="text-xs text-slate-600 space-y-1.5 mb-6">
              <li>• Đặt tủ & Thanh toán trực tuyến</li>
              <li>• Quản lý đơn, Lịch sử đặt chỗ</li>
              <li>• Gia hạn tủ & Hủy hoàn tiền</li>
            </ul>
            <div className="text-xs font-mono bg-slate-100 p-2 rounded text-slate-600">
              features/bookings
            </div>
          </div>

          {/* Card Dương */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-4">
              <LayoutDashboard className="w-6 h-6" />
            </div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-slate-900">Phân Hệ 3</h3>
              <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-semibold">Dương</span>
            </div>
            <h4 className="font-semibold text-amber-600 text-sm mb-2">Operations & Admin</h4>
            <ul className="text-xs text-slate-600 space-y-1.5 mb-6">
              <li>• Dashboard thống kê & Giám sát</li>
              <li>• Quản lý trạm & Sơ đồ ô tủ trực quan</li>
              <li>• Cứu hộ: Mở tủ khẩn cấp từ xa</li>
            </ul>
            <div className="text-xs font-mono bg-slate-100 p-2 rounded text-slate-600">
              features/admin
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 px-6 text-center text-xs text-slate-500">
        Đồ Án Tốt Nghiệp Kỹ Thuật Phần Mềm • Hệ Thống SmartLocker Management System (SLMS)
      </footer>
    </div>
  )
}

export default App
