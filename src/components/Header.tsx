import React from 'react'
import { 
  Flame, 
  UtensilsCrossed, 
  ChefHat, 
  BarChart3, 
  Settings, 
  BookOpen,
  Wifi, 
  WifiOff, 
  RefreshCw,
  QrCode
} from 'lucide-react'
import { usePosStore, type PosView } from '../store/usePosStore'
import { isFirebaseReady, syncPendingOrdersToFirebase } from '../lib/firebase'

export const Header: React.FC = () => {
  const { 
    currentView, 
    setCurrentView, 
    isOnline, 
    pendingSyncCount,
    refreshSyncCount,
    shopSettings,
    tableSessions,
    openTableStatusModal
  } = usePosStore()

  const [isSyncing, setIsSyncing] = React.useState(false)

  const occupiedTableCount = Object.values(tableSessions).filter(s => s.status === 'occupied').length

  const handleManualSync = async () => {
    if (isSyncing) return
    setIsSyncing(true)
    try {
      await syncPendingOrdersToFirebase()
      await refreshSyncCount()
    } finally {
      setIsSyncing(false)
    }
  }

  const navItems: { view: PosView; label: string; icon: React.ReactNode }[] = [
    { view: 'pos', label: 'แคชเชียร์ / ขาย', icon: <UtensilsCrossed className="w-5 h-5" /> },
    { view: 'kitchen', label: 'จอครัว (KDS)', icon: <ChefHat className="w-5 h-5" /> },
    { view: 'sales', label: 'รายงานยอดขาย', icon: <BarChart3 className="w-5 h-5" /> },
    { view: 'menu', label: 'จัดการเมนู & รสชาติ', icon: <BookOpen className="w-5 h-5" /> },
    { view: 'settings', label: 'ตั้งค่า & บลูทูธ', icon: <Settings className="w-5 h-5" /> }
  ]

  return (
    <header className="no-print sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-2">
        {/* Logo & Shop Brand */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-md shadow-red-200 flex-shrink-0">
            <Flame className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse text-amber-300" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-slate-900 text-base sm:text-xl tracking-tight leading-none whitespace-nowrap">
                {shopSettings.brandTitle || 'POS ตุ่น'}
              </span>
              {shopSettings.shopTagline && (
                <span className="hidden md:inline-block px-2 py-0.5 text-xs font-semibold bg-red-50 text-red-700 rounded-full border border-red-200">
                  {shopSettings.shopTagline}
                </span>
              )}
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate max-w-[110px] sm:max-w-none hidden xs:block">
              {shopSettings.shopName} · {shopSettings.branchName}
            </p>
          </div>
        </div>

        {/* View Switcher Tabs (Desktop / iPad) */}
        <nav className="hidden lg:flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          {navItems.map((item) => {
            const isActive = currentView === item.view
            return (
              <button
                key={item.view}
                onClick={() => setCurrentView(item.view)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        {/* Right Section: Network Status & Mobile Navigation */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Table Management & Check Bill Modal Trigger */}
          <button
            onClick={openTableStatusModal}
            className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs flex-shrink-0 ${
              occupiedTableCount > 0
                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200'
                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200'
            }`}
            title="ผังโต๊ะและเช็คบิล"
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ผังโต๊ะ</span>
            <span className="sm:hidden text-[11px]">โต๊ะ</span>
            {occupiedTableCount > 0 && (
              <span className="bg-white text-amber-700 px-1.5 py-0.2 rounded-full text-[10px] font-black">
                {occupiedTableCount}
              </span>
            )}
          </button>

          {/* Quick link to Table QR customer mode (Desktop only) */}
          <button
            onClick={() => {
              try {
                window.history.pushState({}, '', '?table=1')
              } catch {}
              setCurrentView('online-order')
            }}
            className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-300 transition-all cursor-pointer shadow-2xs whitespace-nowrap"
            title="เปิดดูหน้าสั่งอาหารที่โต๊ะผ่าน QR Code (จำลอง โต๊ะ 1)"
          >
            <QrCode className="w-3.5 h-3.5 text-indigo-600" />
            <span>หน้าสั่ง QR โต๊ะ</span>
          </button>

          {/* Quick link to LINE Takeaway customer mode (Desktop only) */}
          <button
            onClick={() => {
              try {
                window.history.pushState({}, '', '?mode=order')
              } catch {}
              setCurrentView('online-order')
            }}
            className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 transition-all cursor-pointer shadow-2xs whitespace-nowrap"
            title="เปิดดูหน้าสั่งอาหารกลับบ้านสำหรับลูกค้าผ่าน LINE"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>หน้าสั่ง LINE</span>
          </button>

          {/* Sync & Network status badge */}
          <div className="flex items-center gap-1 bg-slate-100 py-1 px-1.5 sm:px-2.5 rounded-lg border border-slate-200 text-xs flex-shrink-0">
            {isOnline ? (
              <span className="flex items-center gap-1 text-emerald-700 font-medium" title={isFirebaseReady() ? 'เชื่อมต่อ Firebase แล้ว' : 'เก็บข้อมูลในเครื่อง (Dexie)'}>
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden md:inline">
                  {isFirebaseReady() ? 'คลาวด์' : 'ออนไลน์'}
                </span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-700 font-medium" title="ออฟไลน์: บันทึกข้อมูลลง IndexedDB อัตโนมัติ">
                <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden md:inline">ออฟไลน์</span>
              </span>
            )}

            {pendingSyncCount > 0 && (
              <button
                onClick={handleManualSync}
                disabled={isSyncing || !isOnline}
                className="flex items-center gap-1 ml-0.5 pl-1 border-l border-slate-300 text-amber-700 font-semibold hover:text-amber-800"
                title="คลิกเพื่อซิงก์ออเดอร์ขึ้นคลาวด์"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{pendingSyncCount}</span>
              </button>
            )}
          </div>

          {/* Mobile Tab Icons (Tablet & Mobile) */}
          <div className="flex lg:hidden items-center gap-0.5 sm:gap-1 bg-slate-100 p-0.5 sm:p-1 rounded-xl border border-slate-200 flex-shrink-0">
            {navItems.map((item) => {
              const isActive = currentView === item.view
              return (
                <button
                  key={item.view}
                  onClick={() => setCurrentView(item.view)}
                  title={item.label}
                  className={`p-1.5 sm:p-2 rounded-lg transition-all cursor-pointer ${
                    isActive
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.icon}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </header>
  )
}
