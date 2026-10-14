import React from 'react'
import { 
  Flame, 
  UtensilsCrossed, 
  ChefHat, 
  BarChart3, 
  Settings, 
  Wifi, 
  WifiOff, 
  RefreshCw,
  ShoppingBag
} from 'lucide-react'
import { usePosStore, type PosView } from '../store/usePosStore'
import { isFirebaseReady, syncPendingOrdersToFirebase } from '../lib/firebase'

export const Header: React.FC = () => {
  const { 
    currentView, 
    setCurrentView, 
    cart, 
    toggleMobileCart, 
    isOnline, 
    pendingSyncCount,
    refreshSyncCount,
    shopSettings 
  } = usePosStore()

  const [isSyncing, setIsSyncing] = React.useState(false)

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const cartSubtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

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
    { view: 'settings', label: 'ตั้งค่า & บลูทูธ', icon: <Settings className="w-5 h-5" /> }
  ]

  return (
    <header className="no-print sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-2">
        {/* Logo & Shop Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-md shadow-red-200 flex-shrink-0">
            <Flame className="w-6 h-6 animate-pulse text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-slate-900 text-lg sm:text-xl tracking-tight leading-none">
                POS <span className="text-red-600">ตุ่น</span>
              </span>
              <span className="hidden md:inline-block px-2 py-0.5 text-xs font-semibold bg-red-50 text-red-700 rounded-full border border-red-200">
                หม่าล่าทอดกรอบ
              </span>
            </div>
            <p className="text-[11px] text-slate-600 font-medium truncate max-w-[140px] sm:max-w-none">
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

        {/* Right Section: Network Status & Mobile Quick Cart */}
        <div className="flex items-center gap-2">
          {/* Sync & Network status badge */}
          <div className="flex items-center gap-1.5 bg-slate-100 py-1 px-2.5 rounded-lg border border-slate-200 text-xs">
            {isOnline ? (
              <span className="flex items-center gap-1 text-emerald-700 font-medium" title={isFirebaseReady() ? 'เชื่อมต่อ Firebase แล้ว' : 'เก็บข้อมูลในเครื่อง (Dexie)'}>
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">
                  {isFirebaseReady() ? 'คลาวด์' : 'ออนไลน์'}
                </span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-700 font-medium" title="ออฟไลน์: บันทึกข้อมูลลง IndexedDB อัตโนมัติ">
                <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden sm:inline">ออฟไลน์</span>
              </span>
            )}

            {pendingSyncCount > 0 && (
              <button
                onClick={handleManualSync}
                disabled={isSyncing || !isOnline}
                className="flex items-center gap-1 ml-1 pl-1.5 border-l border-slate-300 text-amber-700 font-semibold hover:text-amber-800"
                title="คลิกเพื่อซิงก์ออเดอร์ขึ้นคลาวด์"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{pendingSyncCount}</span>
              </button>
            )}
          </div>

          {/* Mobile Tab Icons (Tablet & Mobile) */}
          <div className="flex lg:hidden items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
            {navItems.map((item) => {
              const isActive = currentView === item.view
              return (
                <button
                  key={item.view}
                  onClick={() => setCurrentView(item.view)}
                  title={item.label}
                  className={`p-2 rounded-md transition-all ${
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

          {/* Mobile Cart Trigger Button */}
          {currentView === 'pos' && (
            <button
              onClick={() => toggleMobileCart(true)}
              className="lg:hidden relative flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg font-bold text-sm shadow-sm"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{cartSubtotal}฿</span>
              {totalCartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-slate-950 text-[11px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                  {totalCartCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
