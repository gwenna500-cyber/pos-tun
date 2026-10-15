import React, { useEffect } from 'react'
import { Header } from './components/Header'
import { MenuCatalog } from './components/MenuCatalog'
import { CartPanel } from './components/CartPanel'
import { KitchenView } from './components/KitchenView'
import { SalesReportView } from './components/SalesReportView'
import { SettingsView } from './components/SettingsView'
import { MenuManagementView } from './components/MenuManagementView'
import { PaymentModal } from './components/PaymentModal'
import { ReceiptSlip } from './components/ReceiptSlip'
import { LineTakeawayOrderView } from './components/LineTakeawayOrderView'
import { TableStatusModal } from './components/TableStatusModal'
import { usePosStore } from './store/usePosStore'
import { initializeDatabase, db, saveTableSessionsToDb } from './lib/db'
import { isFirebaseReady, initFirebaseService, subscribeToFirebaseOrders, updateFirebaseTableSession } from './lib/firebase'
import { DEFAULT_SHOP_SETTINGS } from './lib/constants'
import type { TableSession, Order } from './types'
import { ShoppingBag, ArrowRight } from 'lucide-react'

export const App: React.FC = () => {
  const {
    currentView,
    cart,
    discount,
    isMobileCartOpen,
    toggleMobileCart,
    setIsOnline,
    refreshSyncCount,
    setShopSettings,
    loadMenuAndSpicy
  } = usePosStore()

  // Initialize DB and Network Listeners on Mount
  useEffect(() => {
    const init = async () => {
      await initializeDatabase()
      await loadMenuAndSpicy()
      
      // Load saved shop settings from Dexie
      try {
        const saved = await db.settings.get('shopSettings')
        let settingsToUse = saved?.value || DEFAULT_SHOP_SETTINGS

        // If local settings have empty Firebase config, auto-populate with provided project config
        if (!settingsToUse.firebaseConfig?.apiKey || settingsToUse.firebaseConfig.apiKey === '') {
          settingsToUse = {
            ...settingsToUse,
            firebaseEnabled: true,
            firebaseConfig: DEFAULT_SHOP_SETTINGS.firebaseConfig
          }
          await db.settings.put({ key: 'shopSettings', value: settingsToUse })
        }

        setShopSettings(settingsToUse)
        if (settingsToUse.firebaseEnabled && settingsToUse.firebaseConfig) {
          initFirebaseService(settingsToUse.firebaseConfig)
        }
      } catch (err) {
        console.error('Failed to load settings:', err)
        initFirebaseService(DEFAULT_SHOP_SETTINGS.firebaseConfig)
      }

      // Connect Firebase subscriptions for cross-device real-time sync
      if (isFirebaseReady()) {
        usePosStore.getState().loadTableSessions()

        subscribeToFirebaseOrders(async (cloudOrders) => {
          if (cloudOrders && cloudOrders.length > 0) {
            for (const ord of cloudOrders) {
              try {
                if (!ord) continue
                const validOrder: Order = {
                  ...ord,
                  id: ord.id || (ord as any).orderId || (ord as any).firebaseId || `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
                }
                await db.orders.put(validOrder)

                // If this order is for a table, auto-open table as occupied if currently available
                if (ord.isTableQrOrder && ord.tableNumber && ord.status !== 'cancelled' && ord.status !== 'completed') {
                  const cleanT = ord.tableNumber.trim().startsWith('โต๊ะ') ? ord.tableNumber.trim() : `โต๊ะ ${ord.tableNumber.trim()}`
                  const currentSession = usePosStore.getState().tableSessions[cleanT]
                  if (!currentSession || currentSession.status === 'available') {
                    const autoSession: TableSession = {
                      tableNumber: cleanT,
                      sessionId: ord.tableSessionId || `sess_${Date.now()}`,
                      status: 'occupied',
                      openedAt: ord.createdAt || Date.now(),
                      orderCount: 1,
                      totalAmount: ord.grandTotal || 0,
                      lastOrderAt: ord.createdAt || Date.now(),
                      customerName: ord.customerName,
                      paymentMethod: ord.paymentMethod
                    }
                    const updatedSessions = {
                      ...usePosStore.getState().tableSessions,
                      [cleanT]: autoSession
                    }
                    usePosStore.setState({ tableSessions: updatedSessions })
                    saveTableSessionsToDb(updatedSessions).catch(console.error)
                    updateFirebaseTableSession(autoSession).catch(console.error)
                  }
                }
              } catch (e) {
                console.warn('Failed to cache cloud order locally:', e)
              }
            }
            refreshSyncCount()
          }
        })
      }

      await refreshSyncCount()
    }

    init()

    const handleOnline = () => {
      setIsOnline(true)
      refreshSyncCount()
    }
    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [setIsOnline, refreshSyncCount, setShopSettings])

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const grandTotal = Math.max(0, subtotal - (discount || 0))

  if (currentView === 'online-order') {
    return <LineTakeawayOrderView />
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      {/* App Header */}
      <Header />

      {/* Main View Area */}
      <main className="flex-1 flex flex-col">
        {currentView === 'pos' && (
          <div className="flex-1 flex flex-col lg:flex-row max-w-[1600px] w-full mx-auto">
            {/* Left Section (65% on iPad / Desktop Landscape): Menu Catalog */}
            <div className="w-full lg:w-[65%] p-3 sm:p-4 sm:pr-2 flex flex-col min-h-0 pb-24 lg:pb-4">
              {/* Menu Items Catalog */}
              <div className="flex-1">
                <MenuCatalog />
              </div>
            </div>

            {/* Right Section (35% on iPad / Desktop Landscape): Cart & Cooking Modifiers */}
            <div className="hidden lg:block lg:w-[35%] h-[calc(100vh-65px)] sticky top-[65px]">
              <CartPanel />
            </div>

            {/* Mobile / Vertical Tablet Sticky Bottom Bar */}
            <div className="lg:hidden no-print fixed bottom-0 left-0 right-0 z-20 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 shadow-lg flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="relative w-11 h-11 rounded-xl bg-red-600 text-white flex items-center justify-center font-black">
                  <ShoppingBag className="w-5 h-5" />
                  {totalCartCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                      {totalCartCount}
                    </span>
                  )}
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-bold">
                    {totalCartCount > 0 ? `${totalCartCount} ไม้` : 'ยังไม่มีรายการ'}
                  </div>
                  <div className="text-xl font-black text-slate-900 leading-none">
                    {grandTotal} <span className="text-xs font-bold text-slate-600">฿</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => toggleMobileCart(true)}
                disabled={totalCartCount === 0}
                className="flex-1 max-w-[200px] h-12 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md shadow-red-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>ดูตะกร้า / ชำระ</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile Cart Drawer Modal */}
            {isMobileCartOpen && (
              <div className="lg:hidden no-print fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col justify-end">
                <div 
                  className="absolute inset-0"
                  onClick={() => toggleMobileCart(false)} 
                />
                <div className="relative z-10 bg-white rounded-t-3xl max-h-[85vh] h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-slide-up">
                  <CartPanel isMobileDrawer={true} />
                </div>
              </div>
            )}
          </div>
        )}

        {currentView === 'kitchen' && <KitchenView />}
        {currentView === 'sales' && <SalesReportView />}
        {currentView === 'menu' && <MenuManagementView />}
        {currentView === 'settings' && <SettingsView />}
      </main>

      {/* Global Modals */}
      <PaymentModal />
      <TableStatusModal />
      <ReceiptSlip />
    </div>
  )
}

export default App
