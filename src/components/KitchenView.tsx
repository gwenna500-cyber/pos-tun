import React, { useState, useEffect } from 'react'
import { 
  Flame, 
  Clock, 
  CheckCircle, 
  ChefHat, 
  Volume2, 
  VolumeX, 
  Check, 
  RefreshCw,
  QrCode,
  UtensilsCrossed,
  Sparkles
} from 'lucide-react'
import { updateOrderStatusInDb, getTodayOrders } from '../lib/db'
import { updateFirebaseOrderStatus, subscribeToFirebaseOrders, isFirebaseReady } from '../lib/firebase'
import { playKitchenAlert } from '../lib/soundAndHaptic'
import { SPICY_LEVELS } from '../lib/constants'
import { usePosStore } from '../store/usePosStore'
import type { Order, OrderStatus } from '../types'

export const KitchenView: React.FC = () => {
  const { spicyOptions } = usePosStore()
  const [orders, setOrders] = useState<Order[]>([])
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'cooking' | 'ready'>('all')
  const [soundOn, setSoundOn] = useState(true)
  const [lastOrderCount, setLastOrderCount] = useState(0)

  // Load orders from Dexie & Firebase
  const loadOrders = async () => {
    try {
      const localOrders = await getTodayOrders()
      setOrders(localOrders)
    } catch (e) {
      console.error('Error loading kitchen orders:', e)
    }
  }

  useEffect(() => {
    loadOrders()
    const interval = setInterval(loadOrders, 5000)

    // Also subscribe to Firebase Realtime DB if available
    let unsubscribe: (() => void) | null = null
    if (isFirebaseReady()) {
      unsubscribe = subscribeToFirebaseOrders((firebaseOrders) => {
        if (firebaseOrders && firebaseOrders.length > 0) {
          // Sort descending
          const sorted = [...firebaseOrders].sort((a, b) => b.createdAt - a.createdAt)
          setOrders(sorted)
        }
      })
    }

    return () => {
      clearInterval(interval)
      if (unsubscribe) unsubscribe()
    }
  }, [])

  // Audio chime when a new order arrives
  useEffect(() => {
    const activeCount = orders.filter(o => o.status === 'pending').length
    if (activeCount > lastOrderCount && lastOrderCount > 0 && soundOn) {
      playKitchenAlert()
    }
    setLastOrderCount(activeCount)
  }, [orders, soundOn])

  // Change order status
  const handleUpdateStatus = async (orderId: string, nextStatus: OrderStatus) => {
    await updateOrderStatusInDb(orderId, nextStatus)
    if (isFirebaseReady()) {
      await updateFirebaseOrderStatus(orderId, nextStatus)
    }
    // Update local state immediately
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: nextStatus } : o))
  }

  // Filter orders
  const filteredOrders = orders.filter(order => {
    if (order.status === 'completed' || order.status === 'cancelled') return false
    if (statusFilter === 'all') return true
    return order.status === statusFilter
  })

  // Format elapsed time (e.g. 5 นาทีที่แล้ว)
  const getElapsedTime = (createdAt: number) => {
    const mins = Math.floor((Date.now() - createdAt) / 60000)
    if (mins < 1) return 'เมื่อสักครู่'
    return `${mins} นาทีที่แล้ว`
  }

  const pendingCount = orders.filter(o => o.status === 'pending').length
  const cookingCount = orders.filter(o => o.status === 'cooking').length
  const readyCount = orders.filter(o => o.status === 'ready').length

  return (
    <div className="flex flex-col h-[calc(100vh-65px)] bg-slate-100 p-3 sm:p-5 overflow-hidden">
      {/* KDS Header Bar */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-xs mb-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-sm">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
              จอครัว & สเตชันทอด/ย่าง (Kitchen View)
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              อัปเดตคิวเรียลไทม์ · กำลังรอ {pendingCount} คิว · กำลังปรุง {cookingCount} คิว
            </p>
          </div>
        </div>

        {/* Filter Buttons & Sound Control */}
        <div className="flex items-center gap-2">
          {/* Status Filter Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              ทั้งหมด ({pendingCount + cookingCount + readyCount})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                statusFilter === 'pending' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600'
              }`}
            >
              <span>รอคิว</span>
              {pendingCount > 0 && <span className="bg-white/20 px-1.5 py-0.2 rounded-full text-[10px]">{pendingCount}</span>}
            </button>
            <button
              onClick={() => setStatusFilter('cooking')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                statusFilter === 'cooking' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600'
              }`}
            >
              <span>กำลังปรุง</span>
              {cookingCount > 0 && <span className="bg-white/20 px-1.5 py-0.2 rounded-full text-[10px]">{cookingCount}</span>}
            </button>
            <button
              onClick={() => setStatusFilter('ready')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                statusFilter === 'ready' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'
              }`}
            >
              <span>เสร็จแล้ว</span>
              {readyCount > 0 && <span className="bg-white/20 px-1.5 py-0.2 rounded-full text-[10px]">{readyCount}</span>}
            </button>
          </div>

          {/* Sound alert toggle */}
          <button
            onClick={() => setSoundOn(!soundOn)}
            className={`p-2 rounded-xl border transition-colors ${
              soundOn ? 'bg-red-50 border-red-200 text-red-600' : 'bg-slate-100 border-slate-200 text-slate-400'
            }`}
            title={soundOn ? 'เปิดเสียงเตือนเมื่อมีคิวใหม่' : 'ปิดเสียงเตือน'}
          >
            {soundOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          {/* Refresh manual */}
          <button
            onClick={loadOrders}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200"
            title="รีเฟรชรายการ"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Orders Grid (Card Layout with Huge Queue Number) */}
      <div className="flex-1 overflow-y-auto">
        {filteredOrders.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8">
            <ChefHat className="w-16 h-16 stroke-1 text-slate-300 mb-2" />
            <h3 className="font-bold text-lg text-slate-600">ไม่มีออเดอร์ในสถานะนี้</h3>
            <p className="text-xs text-slate-400">ออเดอร์ใหม่จากหน้าแคชเชียร์จะเด้งขึ้นหน้านี้ทันทีพร้อมเสียงเตือน</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 pb-8">
            {filteredOrders.map((order) => {
              // Status theme
              let statusBorder = 'border-amber-300'
              let statusBadge = 'bg-amber-100 text-amber-800'
              let statusLabel = 'รอลงทอด'

              if (order.status === 'cooking') {
                statusBorder = 'border-blue-400 shadow-md ring-2 ring-blue-100'
                statusBadge = 'bg-blue-600 text-white'
                statusLabel = 'กำลังทอด...'
              } else if (order.status === 'ready') {
                statusBorder = 'border-emerald-400 shadow-sm bg-emerald-50/20'
                statusBadge = 'bg-emerald-600 text-white'
                statusLabel = 'ทอดเสร็จแล้ว'
              }

              return (
                <div
                  key={order.id}
                  className={`bg-white rounded-2xl border-2 ${statusBorder} shadow-xs flex flex-col justify-between overflow-hidden transition-all`}
                >
                  {/* Card Header: Huge Queue Number & Timer */}
                  <div className="p-3.5 bg-slate-50/90 border-b border-slate-200/80 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-none">
                          {order.orderNumber}
                        </span>
                        
                        {order.isTableQrOrder || order.diningType === 'dine_in' ? (
                          <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-indigo-600 text-white shadow-2xs flex items-center gap-1">
                            <UtensilsCrossed className="w-3.5 h-3.5" />
                            <span>{order.tableOrQueue || 'ทานที่ร้าน'}</span>
                          </span>
                        ) : (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-200 text-slate-700">
                            {order.tableOrQueue}
                          </span>
                        )}

                        {order.isTableQrOrder && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1">
                            <QrCode className="w-3 h-3 text-indigo-600" />
                            <span>QR โต๊ะ</span>
                          </span>
                        )}

                        {order.isLineOrder && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-[#06C755] text-white shadow-2xs">
                            LINE สั่งกลับบ้าน
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1 font-medium">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{getElapsedTime(order.createdAt)}</span>
                        <span>· {order.diningType === 'takeaway' ? '🥡 รับกลับบ้าน' : '🍽️ นั่งทานที่ร้าน'}</span>
                      </div>
                      {order.isLineOrder && (
                        <div className="mt-1.5 text-xs font-bold text-emerald-900 bg-emerald-50/80 px-2.5 py-1 rounded-lg border border-emerald-200 flex flex-wrap gap-1.5">
                          {order.customerName && <span>👤 คุณ {order.customerName}</span>}
                          {order.customerPhone && <span>· 📞 {order.customerPhone}</span>}
                          {order.pickupTime && <span>· ⏰ นัดรับ: {order.pickupTime}</span>}
                        </div>
                      )}
                      {order.isTableQrOrder && order.customerName && order.customerName !== order.tableOrQueue && (
                        <div className="mt-1 text-xs font-semibold text-indigo-900">
                          <span>👤 คุณ {order.customerName}</span>
                        </div>
                      )}
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-xs font-black ${statusBadge}`}>
                      {statusLabel}
                    </span>
                  </div>

                  {/* Order Addons (ตัวเลือกพิเศษของบิล เช่น โรยงาขาวคั่วเยอะๆ, ทอดกรอบแห้งพิเศษ) */}
                  {order.orderAddons && order.orderAddons.length > 0 && (
                    <div className="px-3.5 py-2 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-950 border-b border-amber-200 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-black uppercase text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-700" />
                        <span>ตัวเลือกพิเศษ:</span>
                      </span>
                      {order.orderAddons.map((addon, aIdx) => (
                        <span key={aIdx} className="text-xs font-black bg-white px-2.5 py-0.5 rounded-lg border border-amber-300 shadow-2xs text-amber-900">
                          {addon.includes('งา') ? `🌾 ${addon}` : addon.includes('กรอบ') ? `🍟 ${addon}` : addon}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Order General Notes (if any) */}
                  {order.notes && (
                    <div className="px-3.5 py-2 bg-amber-50 text-amber-900 border-b border-amber-200 text-xs font-bold">
                      โน้ตบิล: {order.notes}
                    </div>
                  )}

                  {/* Items List (Large text with per-item spicy level for kitchen staff) */}
                  <div className="p-3.5 space-y-2 flex-1">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      รายการอาหาร ({order.totalItemsCount} รายการ):
                    </div>
                    <div className="space-y-1.5">
                      {order.items.map((item, idx) => {
                        const itemSpicy = item.spicyLevel ? (spicyOptions.find(s => s.id === item.spicyLevel) || SPICY_LEVELS.find(s => s.id === item.spicyLevel)) : null
                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-sm sm:text-base font-bold bg-slate-50/70 p-2.5 rounded-xl border border-slate-100"
                          >
                            <div className="flex-1 min-w-0 pr-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-slate-900 font-extrabold text-sm sm:text-base">
                                  {item.name}
                                </span>
                                {itemSpicy && (
                                  <span className={`px-2 py-0.5 rounded-md text-xs font-black border ${itemSpicy.badgeClass}`}>
                                    {itemSpicy.label.split(' ')[0]}
                                  </span>
                                )}
                                {item.addons && item.addons.length > 0 && (
                                  <span className="px-2 py-0.5 rounded-md text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                                    {item.addons.join(' · ')}
                                  </span>
                                )}
                              </div>
                              {item.note && (
                                <span className="text-xs text-amber-800 font-semibold block mt-0.5">
                                  โน้ต: {item.note}
                                </span>
                              )}
                            </div>
                            <span className="text-red-600 font-black text-lg bg-red-50 px-2.5 py-0.5 rounded-lg border border-red-100 flex-shrink-0">
                              ×{item.quantity}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Action Buttons: Pending -> Cooking -> Ready -> Completed */}
                  <div className="p-3 bg-slate-50 border-t border-slate-100">
                    {order.status === 'pending' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'cooking')}
                        className="w-full h-13 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-black text-base shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
                      >
                        <Flame className="w-5 h-5" />
                        <span>เริ่มลงทอด</span>
                      </button>
                    )}

                    {order.status === 'cooking' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'ready')}
                        className="w-full h-13 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-black text-base shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
                      >
                        <CheckCircle className="w-5 h-5" />
                        <span>ทอดเสร็จแล้ว (พร้อมเสิร์ฟ)</span>
                      </button>
                    )}

                    {order.status === 'ready' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'completed')}
                        className="w-full h-13 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-black text-base shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
                      >
                        <Check className="w-5 h-5 text-emerald-400" />
                        <span>ส่งมอบให้ลูกค้าเรียบร้อย</span>
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
