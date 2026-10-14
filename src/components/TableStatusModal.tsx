import React, { useState, useEffect } from 'react'
import { 
  X, 
  UtensilsCrossed, 
  Banknote, 
  QrCode, 
  RotateCcw, 
  Check, 
  Printer, 
  AlertCircle,
  Sparkles,
  ExternalLink,
  Lock,
  Flame
} from 'lucide-react'
import { usePosStore } from '../store/usePosStore'
import { db } from '../lib/db'
import { SPICY_LEVELS } from '../lib/constants'
import type { Order, PaymentMethod } from '../types'

export const TableStatusModal: React.FC = () => {
  const { 
    isTableStatusModalOpen, 
    closeTableStatusModal, 
    shopSettings, 
    tableSessions, 
    billTableSession, 
    clearTableSession, 
    openTableSession,
    openReceiptModal,
    spicyOptions
  } = usePosStore()

  const [activeTab, setActiveTab] = useState<'all' | 'occupied' | 'billed' | 'available'>('all')
  const [selectedTableForBilling, setSelectedTableForBilling] = useState<string | null>(null)
  const [billingPaymentMethod, setBillingPaymentMethod] = useState<PaymentMethod>('cash')
  const [isProcessing, setIsProcessing] = useState(false)
  
  // Table orders preview
  const [selectedTableOrders, setSelectedTableOrders] = useState<{ table: string; orders: Order[] } | null>(null)
  const [allRecentOrders, setAllRecentOrders] = useState<Order[]>([])

  // Load orders to associate with tables
  useEffect(() => {
    if (!isTableStatusModalOpen) return
    let isMounted = true

    const loadOrders = async () => {
      try {
        const orders = await db.orders.toArray()
        if (isMounted) {
          setAllRecentOrders(orders)
        }
      } catch (err) {
        console.error('Failed to load orders for tables:', err)
      }
    }

    loadOrders()
    const timer = setInterval(loadOrders, 3000)
    return () => {
      isMounted = false
      clearInterval(timer)
    }
  }, [isTableStatusModalOpen])

  if (!isTableStatusModalOpen) return null

  const tableList = shopSettings.tableList && shopSettings.tableList.length > 0
    ? shopSettings.tableList
    : Array.from({ length: shopSettings.tableCount || 10 }, (_, i) => `โต๊ะ ${i + 1}`)

  // Calculate table statistics
  let occupiedCount = 0
  let billedCount = 0
  let availableCount = 0

  tableList.forEach(t => {
    const s = tableSessions[t]?.status || 'available'
    if (s === 'occupied') occupiedCount++
    else if (s === 'billed') billedCount++
    else availableCount++
  })

  // Get active orders for a table
  const getOrdersForTable = (tableName: string) => {
    return allRecentOrders.filter(
      o => (o.tableNumber === tableName || o.tableOrQueue === tableName) && 
           o.status !== 'cancelled'
    )
  }

  // Get active unpaid/cooking orders for a table
  const getActiveOrdersForTable = (tableName: string) => {
    return allRecentOrders.filter(
      o => (o.tableNumber === tableName || o.tableOrQueue === tableName) && 
           o.status !== 'completed' && 
           o.status !== 'cancelled'
    )
  }

  const handleConfirmBill = async (tableName: string) => {
    setIsProcessing(true)
    try {
      await billTableSession(tableName, billingPaymentMethod)
      setSelectedTableForBilling(null)
      // Refresh local orders
      const orders = await db.orders.toArray()
      setAllRecentOrders(orders)
    } catch (err: any) {
      alert(`ไม่สามารถเช็คบิลได้: ${err.message || 'โปรดลองอีกครั้ง'}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClearTable = async (tableName: string) => {
    if (!confirm(`ยืนยันเคลียร์ ${tableName} เพื่อเปิดรับลูกค้ารอบใหม่?`)) return
    setIsProcessing(true)
    try {
      await clearTableSession(tableName)
      if (selectedTableOrders?.table === tableName) {
        setSelectedTableOrders(null)
      }
    } finally {
      setIsProcessing(false)
    }
  }

  const handleViewOrders = (tableName: string) => {
    const orders = getOrdersForTable(tableName)
    setSelectedTableOrders({ table: tableName, orders })
  }

  const formatElapsed = (timestamp?: number) => {
    if (!timestamp) return ''
    const diffMin = Math.floor((Date.now() - timestamp) / 60000)
    if (diffMin < 1) return 'เมื่อสักครู่'
    if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`
    const hours = Math.floor(diffMin / 60)
    const mins = diffMin % 60
    return `${hours} ชม. ${mins} นาทีที่แล้ว`
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                <span>ผังโต๊ะอาหาร & เช็คบิล</span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                  {tableList.length} โต๊ะ
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                ตรวจสอบสถานะโต๊ะ เช็คบิลปิดรอบ และปลดล็อกโต๊ะรับลูกค้ารอบใหม่
              </p>
            </div>
          </div>

          <button
            onClick={closeTableStatusModal}
            className="w-9 h-9 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Counters & Filter Tabs */}
        <div className="px-5 py-3 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
          {/* Quick Counter Badges */}
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                activeTab === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              ทั้งหมด ({tableList.length})
            </button>
            <button
              onClick={() => setActiveTab('occupied')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'occupied'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>กำลังทาน ({occupiedCount})</span>
            </button>
            <button
              onClick={() => setActiveTab('billed')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'billed'
                  ? 'bg-slate-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>เช็คบิลแล้ว ({billedCount})</span>
            </button>
            <button
              onClick={() => setActiveTab('available')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'available'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <span>โต๊ะว่าง ({availableCount})</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-400 font-medium">
            💡 เมื่อกด "เช็คบิล" มือถือของลูกค้าโต๊ะนั้นจะถูกล็อกไม่ให้สั่งต่อทันที
          </div>
        </div>

        {/* Tables Grid */}
        <div className="p-5 overflow-y-auto flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {tableList.map(tableName => {
            const session = tableSessions[tableName]
            const status = session?.status || 'available'
            const activeOrders = getActiveOrdersForTable(tableName)
            const allOrders = getOrdersForTable(tableName)
            const totalTableAmount = activeOrders.reduce((sum, o) => sum + o.grandTotal, 0) || (session?.totalAmount || 0)

            // Filter out by active tab
            if (activeTab === 'occupied' && status !== 'occupied') return null
            if (activeTab === 'billed' && status !== 'billed') return null
            if (activeTab === 'available' && status !== 'available') return null

            let cardBorder = 'border-slate-200 bg-white'
            let statusBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200'
            let statusText = 'ว่าง พร้อมรับลูกค้า'

            if (status === 'occupied') {
              cardBorder = 'border-amber-300 bg-amber-50/20 shadow-xs'
              statusBadge = 'bg-amber-500 text-white border-amber-500'
              statusText = 'กำลังรับประทาน'
            } else if (status === 'billed') {
              cardBorder = 'border-slate-300 bg-slate-50'
              statusBadge = 'bg-slate-600 text-white border-slate-600'
              statusText = '🔒 เช็คบิลแล้ว (ล็อกสั่ง)'
            }

            return (
              <div
                key={tableName}
                className={`rounded-2xl border-2 ${cardBorder} p-4 flex flex-col justify-between transition-all`}
              >
                <div>
                  {/* Table Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm ${
                        status === 'occupied' 
                          ? 'bg-amber-500 text-white' 
                          : status === 'billed'
                            ? 'bg-slate-600 text-white'
                            : 'bg-emerald-600 text-white'
                      }`}>
                        {tableName.replace(/[^0-9]/g, '') || '🍽️'}
                      </div>
                      <span className="font-extrabold text-base text-slate-900">{tableName}</span>
                    </div>

                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusBadge}`}>
                      {statusText}
                    </span>
                  </div>

                  {/* Table Info Details */}
                  {status === 'occupied' && (
                    <div className="space-y-1.5 py-2 border-y border-amber-200/60 my-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">ยอดรวมปัจจุบัน:</span>
                        <span className="font-black text-base text-emerald-600">{totalTableAmount} ฿</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>รายการที่สั่ง:</span>
                        <span className="font-bold text-slate-700">
                          {activeOrders.length > 0 ? `${activeOrders.length} บิล` : `${session?.orderCount || 1} บิล`}
                        </span>
                      </div>
                      {session?.lastOrderAt && (
                        <div className="flex justify-between text-[11px] text-slate-500">
                          <span>สั่งล่าสุด:</span>
                          <span className="font-medium text-slate-600">{formatElapsed(session.lastOrderAt)}</span>
                        </div>
                      )}
                      {session?.customerName && (
                        <div className="text-[11px] text-indigo-700 font-bold truncate">
                          👤 {session.customerName}
                        </div>
                      )}
                      {activeOrders.length > 0 && activeOrders[0]?.spicyLevel && (
                        <div className="flex items-center gap-1.5 text-[11px] pt-0.5 flex-wrap">
                          <span className="text-slate-500">ความเผ็ด:</span>
                          <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-800 font-bold border border-red-200 text-[10px]">
                            🔥 {spicyOptions.find(s => s.id === activeOrders[0].spicyLevel)?.label.split(' ')[0] || SPICY_LEVELS.find(s => s.id === activeOrders[0].spicyLevel)?.label.split(' ')[0] || activeOrders[0].spicyLevel}
                          </span>
                          {activeOrders[0].orderAddons && activeOrders[0].orderAddons.length > 0 && (
                            <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900 font-medium border border-amber-200 text-[10px]">
                              ✨ {activeOrders[0].orderAddons.join(', ')}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {status === 'billed' && (
                    <div className="space-y-1 py-2 border-y border-slate-200 my-2 text-xs">
                      <div className="flex justify-between text-slate-500">
                        <span>สถานะมือถือลูกค้า:</span>
                        <span className="font-black text-amber-700">🔒 ล็อกหน้าจอแล้ว</span>
                      </div>
                      {session?.billedAt && (
                        <div className="flex justify-between text-[11px] text-slate-500">
                          <span>เช็คบิลเมื่อ:</span>
                          <span className="font-medium text-slate-700">{formatElapsed(session.billedAt)}</span>
                        </div>
                      )}
                      {session?.totalAmount !== undefined && session.totalAmount > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">ยอดชำระ:</span>
                          <span className="font-black text-emerald-600">{session.totalAmount} ฿</span>
                        </div>
                      )}
                    </div>
                  )}

                  {status === 'available' && (
                    <div className="py-4 text-center text-xs text-slate-400">
                      โต๊ะว่าง พร้อมให้ลูกค้าสแกน QR นั่งสั่งอาหาร
                    </div>
                  )}
                </div>

                {/* Card Action Buttons */}
                <div className="pt-2 space-y-1.5">
                  {status === 'occupied' && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setSelectedTableForBilling(tableName)}
                        className="flex-1 h-10 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition-all"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>เช็คบิลโต๊ะนี้</span>
                      </button>

                      {allOrders.length > 0 && (
                        <button
                          onClick={() => handleViewOrders(tableName)}
                          className="h-10 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center transition-colors cursor-pointer"
                          title="ดูบิลออเดอร์"
                        >
                          ดูบิล
                        </button>
                      )}
                    </div>
                  )}

                  {status === 'billed' && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleClearTable(tableName)}
                        className="flex-1 h-10 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition-all"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                        <span>เคลียร์โต๊ะ / รับลูกค้าใหม่</span>
                      </button>

                      {allOrders.length > 0 && (
                        <button
                          onClick={() => handleViewOrders(tableName)}
                          className="h-10 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center transition-colors cursor-pointer"
                          title="ดูประวัติบิล"
                        >
                          ดูบิล
                        </button>
                      )}
                    </div>
                  )}

                  {status === 'available' && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openTableSession(tableName)}
                        className="flex-1 h-9 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>เปิดโต๊ะล่วงหน้า</span>
                      </button>

                      <button
                        onClick={() => {
                          try {
                            window.open(`/?table=${tableName.replace(/[^0-9]/g, '')}`, '_blank')
                          } catch {}
                        }}
                        className="h-9 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs flex items-center justify-center transition-colors cursor-pointer"
                        title="เปิดทดสอบหน้าสั่งโต๊ะนี้"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>
            ระบบจะอัปเดตสถานะโต๊ะและล็อกเซสชันลูกค้าแบบ Real-time
          </span>
          <button
            onClick={closeTableStatusModal}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold cursor-pointer transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>

      {/* --- Check Bill Confirmation Sub-Modal --- */}
      {selectedTableForBilling && (
        <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    เช็คบิล {selectedTableForBilling}
                  </h3>
                  <p className="text-xs text-slate-500">
                    ยืนยันการรับชำระเงินและปิดรอบการนั่งทาน
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTableForBilling(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Total to Pay */}
            {(() => {
              const activeOrders = getActiveOrdersForTable(selectedTableForBilling)
              const session = tableSessions[selectedTableForBilling]
              const totalAmount = activeOrders.reduce((sum, o) => sum + o.grandTotal, 0) || (session?.totalAmount || 0)
              
              return (
                <div className="space-y-3">
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-center">
                    <span className="text-xs font-bold text-emerald-800 block mb-0.5">
                      ยอดรวมที่ต้องชำระทั้งหมด:
                    </span>
                    <div className="text-3xl font-black text-emerald-600">
                      {totalAmount} <span className="text-sm font-bold">฿</span>
                    </div>
                    <span className="text-[11px] text-emerald-700 mt-1 block">
                      (รวม {activeOrders.length || 1} ออเดอร์ของโต๊ะนี้)
                    </span>
                  </div>

                  {activeOrders.length > 0 && (
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 max-h-36 overflow-y-auto space-y-2 text-xs">
                      <div className="font-bold text-slate-700 text-[11px]">
                        สรุปรายการอาหาร ({activeOrders.length} บิล):
                      </div>
                      {activeOrders.map(ord => {
                        const sp = spicyOptions.find(s => s.id === ord.spicyLevel)?.label || SPICY_LEVELS.find(s => s.id === ord.spicyLevel)?.label || ord.spicyLevel
                        return (
                          <div key={ord.id} className="p-2 bg-white rounded-xl border border-slate-200/80 space-y-1">
                            <div className="flex justify-between items-center font-bold text-slate-800">
                              <span className="text-red-600">{ord.orderNumber}</span>
                              {ord.spicyLevel && (
                                <span className="text-[10px] font-black text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                                  🔥 {sp}
                                </span>
                              )}
                            </div>
                            {ord.orderAddons && ord.orderAddons.length > 0 && (
                              <div className="text-[10px] text-amber-800 font-semibold">
                                ✨ {ord.orderAddons.join(', ')}
                              </div>
                            )}
                            <div className="text-slate-600 text-[11px]">
                              {ord.items.map(it => `${it.name} ×${it.quantity}`).join(', ')}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                ช่องทางการชำระเงิน:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setBillingPaymentMethod('cash')}
                  className={`p-3 rounded-2xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                    billingPaymentMethod === 'cash'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <Banknote className="w-5 h-5" />
                  <div>
                    <div className="font-extrabold text-xs">เงินสด</div>
                    <div className={`text-[10px] ${billingPaymentMethod === 'cash' ? 'text-emerald-100' : 'text-slate-400'}`}>
                      รับเงินสดหน้าร้าน
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setBillingPaymentMethod('promptpay')}
                  className={`p-3 rounded-2xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                    billingPaymentMethod === 'promptpay'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <QrCode className="w-5 h-5" />
                  <div>
                    <div className="font-extrabold text-xs">พร้อมเพย์ QR</div>
                    <div className={`text-[10px] ${billingPaymentMethod === 'promptpay' ? 'text-blue-100' : 'text-slate-400'}`}>
                      โอนเงิน / สแกนจ่าย
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Lock Notice */}
            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 leading-relaxed flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>
                เมื่อกดเช็คบิล <strong>มือถือของลูกค้าที่เปิดโต๊ะนี้อยู่จะถูกล็อกอัตโนมัติทันที</strong> เพื่อไม่ให้สามารถสั่งอาหารเพิ่มหรือสั่งจากที่บ้านได้
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedTableForBilling(null)}
                className="py-3 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleConfirmBill(selectedTableForBilling)}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>ยืนยันเช็คบิล & ล็อกโต๊ะ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- View Orders for Table Sub-Modal --- */}
      {selectedTableOrders && (
        <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <span>รายการสั่งอาหาร {selectedTableOrders.table}</span>
                  <span className="text-xs font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    รวม {selectedTableOrders.orders.reduce((sum, o) => sum + o.grandTotal, 0)} ฿
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  รวม {selectedTableOrders.orders.length} ออเดอร์
                </p>
              </div>
              <button
                onClick={() => setSelectedTableOrders(null)}
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              {selectedTableOrders.orders.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  ยังไม่มีประวัติออเดอร์
                </div>
              ) : (
                selectedTableOrders.orders.map((order) => {
                  const spicyObj = spicyOptions.find(s => s.id === order.spicyLevel) || SPICY_LEVELS.find(s => s.id === order.spicyLevel)
                  const spicyLabel = spicyObj?.label || order.spicyLevel

                  return (
                    <div key={order.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
                      <div className="flex items-center justify-between font-bold text-slate-800">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-red-600 text-white font-black text-[11px] shadow-2xs">
                            {order.orderNumber}
                          </span>
                          <span className="text-slate-600 font-semibold">
                            {new Date(order.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                          </span>
                          {order.isTableQrOrder && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200">
                              📱 สั่งผ่าน QR
                            </span>
                          )}
                          {order.customerName && order.customerName !== order.tableOrQueue && (
                            <span className="text-[11px] font-semibold text-indigo-900">
                              👤 {order.customerName}
                            </span>
                          )}
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                          order.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : order.status === 'cooking'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {order.status === 'completed' ? 'เสิร์ฟแล้ว' : order.status === 'cooking' ? 'กำลังปรุง' : 'รอคิว'}
                        </span>
                      </div>

                      {/* Spicy Level Badge */}
                      {order.spicyLevel && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-red-50 to-orange-50 text-red-950 border border-red-200">
                          <Flame className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                          <span className="text-[11px] font-bold text-red-800">ระดับความเผ็ด:</span>
                          <span className="px-2 py-0.5 rounded-md bg-red-600 text-white font-black text-[11px] shadow-2xs">
                            {spicyLabel}
                          </span>
                        </div>
                      )}

                      {/* Order Addons (เช่น โรยงาขาวคั่วเยอะๆ, ทอดกรอบแห้งพิเศษ) */}
                      {order.orderAddons && order.orderAddons.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 text-amber-950 border border-amber-200">
                          <span className="text-[11px] font-black text-amber-800 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-600" />
                            <span>ตัวเลือกพิเศษ:</span>
                          </span>
                          {order.orderAddons.map((addon, aIdx) => (
                            <span key={aIdx} className="text-[11px] font-bold bg-white px-2 py-0.5 rounded-md border border-amber-300 text-amber-900 shadow-2xs">
                              {addon.includes('งา') ? `🌾 ${addon}` : addon.includes('กรอบ') ? `🍟 ${addon}` : addon}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Order Notes */}
                      {order.notes && (
                        <div className="px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-[11px] border border-slate-200">
                          <span className="font-bold text-slate-800">📝 หมายเหตุ:</span> {order.notes}
                        </div>
                      )}

                      {/* Items List */}
                      <div className="divide-y divide-slate-200/70 pt-1">
                        {order.items.map((item, itemIdx) => {
                          const itemSpicy = item.spicyLevel ? (spicyOptions.find(s => s.id === item.spicyLevel) || SPICY_LEVELS.find(s => s.id === item.spicyLevel)) : null
                          return (
                            <div key={itemIdx} className="py-1.5 flex justify-between items-start text-slate-600">
                              <div className="flex-1 pr-2">
                                <span className="text-slate-800 font-medium">{item.name}</span>
                                <span className="font-black text-slate-900 ml-1">×{item.quantity}</span>
                                {itemSpicy && (
                                  <span className="inline-block text-[10px] text-red-700 font-bold bg-red-100/80 px-1.5 py-0.2 rounded border border-red-200 ml-1.5">
                                    🔥 {itemSpicy.label}
                                  </span>
                                )}
                                {item.addons && item.addons.length > 0 && (
                                  <span className="inline-block text-[10px] text-amber-800 font-bold bg-amber-100/80 px-1.5 py-0.2 rounded border border-amber-200 ml-1.5">
                                    +{item.addons.join(', ')}
                                  </span>
                                )}
                                {item.note && (
                                  <span className="block text-[10px] text-slate-500 italic mt-0.5">
                                    ({item.note})
                                  </span>
                                )}
                              </div>
                              <span className="font-bold text-slate-900 flex-shrink-0">{item.price * item.quantity} ฿</span>
                            </div>
                          )
                        })}
                      </div>

                      <div className="border-t border-slate-200 pt-1.5 flex justify-between font-black text-slate-900">
                        <span>ยอดบิลนี้:</span>
                        <span className="text-emerald-600 text-sm">{order.grandTotal} ฿</span>
                      </div>

                      <button
                        onClick={() => openReceiptModal(order)}
                        className="w-full mt-1 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold text-[11px] flex items-center justify-center gap-1.5 hover:bg-slate-100 active:scale-[0.99] transition-all cursor-pointer shadow-2xs"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>พิมพ์ใบเสร็จบิลนี้</span>
                      </button>
                    </div>
                  )
                })
              )}
            </div>

            <div className="p-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedTableOrders(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
