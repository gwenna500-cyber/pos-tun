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
  Flame,
  Edit3,
  Trash2,
  Copy
} from 'lucide-react'
import { usePosStore } from '../store/usePosStore'
import { db } from '../lib/db'
import { SPICY_LEVELS } from '../lib/constants'
import { generatePromptPayQrDataUrl } from '../lib/promptpay'
import { isFirebaseReady, subscribeToFirebaseOrders } from '../lib/firebase'
import QRCode from 'qrcode'
import type { Order, PaymentMethod, CartItem } from '../types'
import { EditOrderModal } from './EditOrderModal'

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
    spicyOptions,
    deleteExistingOrder
  } = usePosStore()

  const [activeTab, setActiveTab] = useState<'all' | 'occupied' | 'billed' | 'available'>('all')
  const [selectedTableForBilling, setSelectedTableForBilling] = useState<string | null>(null)
  const [billingPaymentMethod, setBillingPaymentMethod] = useState<PaymentMethod>('cash')
  const [billingQrUrl, setBillingQrUrl] = useState<string>('')
  const [copiedPromptPay, setCopiedPromptPay] = useState(false)
  const [cashReceived, setCashReceived] = useState<string>('')
  const [isPaymentMethodLocked, setIsPaymentMethodLocked] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [editingOrderForTable, setEditingOrderForTable] = useState<Order | null>(null)
  
  // Table orders preview
  const [selectedTableOrders, setSelectedTableOrders] = useState<{ table: string; orders: Order[] } | null>(null)
  const [allRecentOrders, setAllRecentOrders] = useState<Order[]>([])

  // Table QR Code Display Modal
  const [tableForQrModal, setTableForQrModal] = useState<string | null>(null)
  const [tableQrDataUrl, setTableQrDataUrl] = useState<string>('')
  const [copiedTableUrl, setCopiedTableUrl] = useState<boolean>(false)

  // Generate Table QR Data URL
  useEffect(() => {
    if (tableForQrModal) {
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const numOnly = tableForQrModal.replace(/[^0-9]/g, '')
      const tableOrderUrl = `${origin}/?table=${numOnly}`
      QRCode.toDataURL(tableOrderUrl, {
        width: 320,
        margin: 2,
        color: { dark: '#0f172a', light: '#ffffff' },
        errorCorrectionLevel: 'H'
      }).then(url => {
        setTableQrDataUrl(url)
      }).catch(err => {
        console.error('Failed to generate table QR:', err)
      })
    } else {
      setTableQrDataUrl('')
      setCopiedTableUrl(false)
    }
  }, [tableForQrModal])

  // Load orders to associate with tables & subscribe to Firebase real-time
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

    let unsubFirebase: (() => void) | undefined
    if (isFirebaseReady()) {
      unsubFirebase = subscribeToFirebaseOrders((cloudOrders) => {
        if (isMounted && cloudOrders && cloudOrders.length > 0) {
          setAllRecentOrders(cloudOrders)
        }
      })
    }

    return () => {
      isMounted = false
      clearInterval(timer)
      if (unsubFirebase) unsubFirebase()
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

  // Get all orders for a table in the current session
  const getOrdersForTable = (tableName: string) => {
    const session = tableSessions[tableName]
    return allRecentOrders.filter(o => {
      const isMatch = o.tableNumber === tableName || o.tableOrQueue === tableName
      if (!isMatch || o.status === 'cancelled') return false

      if (session) {
        if (session.status === 'available') return false
        if (session.sessionId && o.tableSessionId) {
          return o.tableSessionId === session.sessionId
        }
        if (session.openedAt) {
          return o.createdAt >= session.openedAt - 15000
        }
        if (o.status === 'completed') {
          return false
        }
      }
      return o.status !== 'completed' && Date.now() - o.createdAt < 2 * 60 * 60 * 1000
    })
  }

  // Get active unpaid/cooking orders for a table in the current session
  const getActiveOrdersForTable = (tableName: string) => {
    const session = tableSessions[tableName]
    return allRecentOrders.filter(o => {
      const isMatch = o.tableNumber === tableName || o.tableOrQueue === tableName
      if (!isMatch || o.status === 'completed' || o.status === 'cancelled') return false

      if (session) {
        if (session.status === 'available') return false
        if (session.sessionId && o.tableSessionId) {
          return o.tableSessionId === session.sessionId
        }
        if (session.openedAt) {
          return o.createdAt >= session.openedAt - 15000
        }
      }
      return Date.now() - o.createdAt < 2 * 60 * 60 * 1000
    })
  }

  const handleOpenBillingModal = (tableName: string) => {
    const activeOrders = getActiveOrdersForTable(tableName)
    const session = tableSessions[tableName]
    const chosenMethod = session?.paymentMethod || activeOrders.find(o => o.paymentMethod)?.paymentMethod || 'cash'
    setBillingPaymentMethod(chosenMethod)
    setIsPaymentMethodLocked(true)
    setCashReceived('')
    setSelectedTableForBilling(tableName)
  }

  // Generate PromptPay QR Data URL for table billing
  useEffect(() => {
    if (selectedTableForBilling && billingPaymentMethod === 'promptpay') {
      const activeOrders = getActiveOrdersForTable(selectedTableForBilling)
      const session = tableSessions[selectedTableForBilling]
      const totalAmount = activeOrders.reduce((sum, o) => sum + o.grandTotal, 0) || (session?.totalAmount || 0)
      const phone = shopSettings.promptpayPhone || '0812345678'
      generatePromptPayQrDataUrl(phone, totalAmount).then(url => {
        setBillingQrUrl(url)
      })
    } else {
      setBillingQrUrl('')
    }
  }, [selectedTableForBilling, billingPaymentMethod, tableSessions, allRecentOrders, shopSettings.promptpayPhone])

  const handlePrintCombinedTableReceipt = (tableName: string, orders: Order[]) => {
    if (!orders || orders.length === 0) return
    if (orders.length === 1) {
      openReceiptModal(orders[0])
      return
    }

    // Combine items from all orders of this table session
    const combinedItems: CartItem[] = []
    orders.forEach(ord => {
      ord.items.forEach(item => {
        const existing = combinedItems.find(
          i => (i.menuItemId && item.menuItemId ? i.menuItemId === item.menuItemId : i.name === item.name) && 
               i.spicyLevel === item.spicyLevel && 
               JSON.stringify(i.addons || []) === JSON.stringify(item.addons || [])
        )
        if (existing) {
          existing.quantity += item.quantity
        } else {
          combinedItems.push({ ...item })
        }
      })
    })

    const latestOrder = orders[orders.length - 1]
    const combinedOrder: Order = {
      id: `combined_${tableName}_${Date.now()}`,
      orderNumber: `${tableName} (บิลรวม)`,
      tableOrQueue: tableName,
      tableNumber: tableName,
      diningType: 'dine_in',
      items: combinedItems,
      subtotal: orders.reduce((sum, o) => sum + o.subtotal, 0),
      discount: orders.reduce((sum, o) => sum + (o.discount || 0), 0),
      grandTotal: orders.reduce((sum, o) => sum + o.grandTotal, 0),
      totalItemsCount: combinedItems.reduce((sum, i) => sum + i.quantity, 0),
      paymentMethod: latestOrder?.paymentMethod || billingPaymentMethod || 'cash',
      paymentStatus: 'paid',
      status: 'completed',
      createdAt: orders[0]?.createdAt || Date.now(),
      updatedAt: Date.now(),
      completedAt: Date.now(),
      notes: orders.filter(o => o.notes).map(o => o.notes).join(' | '),
      orderAddons: Array.from(new Set(orders.flatMap(o => o.orderAddons || []))),
      isTableQrOrder: true,
      syncStatus: 'synced'
    }

    openReceiptModal(combinedOrder)
  }

  const handleConfirmBill = async (tableName: string) => {
    setIsProcessing(true)
    try {
      await billTableSession(tableName, billingPaymentMethod)
      setSelectedTableForBilling(null)
      // Refresh local orders
      const orders = await db.orders.toArray()
      setAllRecentOrders(orders)

      // Open receipt immediately upon checkout
      const tableOrders = orders.filter(
        o => (o.tableNumber === tableName || o.tableOrQueue === tableName) && 
             o.status !== 'cancelled'
      )
      if (tableOrders.length > 0) {
        if (tableOrders.length === 1) {
          openReceiptModal(tableOrders[0])
        } else {
          handlePrintCombinedTableReceipt(tableName, tableOrders)
        }
      }
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

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setTableForQrModal(tableName)}
                        className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                        title="ดู QR สั่งอาหารโต๊ะนี้"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>QR</span>
                      </button>

                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusBadge}`}>
                        {statusText}
                      </span>
                    </div>
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
                        onClick={() => handleOpenBillingModal(tableName)}
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

                      <button
                        onClick={() => setTableForQrModal(tableName)}
                        className="h-10 px-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs flex items-center justify-center transition-colors cursor-pointer"
                        title="ดู QR สั่งอาหารโต๊ะนี้"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
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

                      <button
                        onClick={() => setTableForQrModal(tableName)}
                        className="h-10 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center transition-colors cursor-pointer"
                        title="ดู QR สั่งอาหารโต๊ะนี้"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {status === 'available' && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openTableSession(tableName)}
                        className="flex-1 h-9 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>เปิดโต๊ะ</span>
                      </button>

                      <button
                        onClick={() => setTableForQrModal(tableName)}
                        className="h-9 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-sm"
                        title="แสดง QR โค้ดสำหรับลูกค้าสแกนสั่ง"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>QR สั่ง</span>
                      </button>

                      <button
                        onClick={() => {
                          try {
                            const numOnly = tableName.replace(/[^0-9]/g, '')
                            window.open(`/?table=${numOnly}`, '_blank')
                          } catch {}
                        }}
                        className="h-9 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs flex items-center justify-center transition-colors cursor-pointer"
                        title="เปิดแท็บสั่งอาหารจำลอง"
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

      {/* --- Table QR Code Modal --- */}
      {tableForQrModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-center">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                  <QrCode className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h3 className="text-base font-black text-slate-900">QR สั่งอาหาร {tableForQrModal}</h3>
                  <p className="text-[11px] text-slate-500">สแกนเพื่อสั่งอาหารเข้าโต๊ะนี้ทันที</p>
                </div>
              </div>
              <button
                onClick={() => setTableForQrModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* QR Code Graphic Box */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center justify-center">
              {tableQrDataUrl ? (
                <img
                  src={tableQrDataUrl}
                  alt={`QR Code ${tableForQrModal}`}
                  className="w-56 h-56 rounded-xl border-4 border-white shadow-md"
                />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-slate-400">
                  กำลังสร้าง QR Code...
                </div>
              )}
              <span className="mt-3 text-xs font-bold text-slate-700 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-2xs">
                🍽️ {tableForQrModal}
              </span>
            </div>

            {/* URL Link Box */}
            <div className="text-left space-y-1">
              <span className="text-[11px] font-bold text-slate-500">ลิงก์สั่งอาหารของโต๊ะ:</span>
              <div className="p-2 bg-slate-100 rounded-xl border border-slate-200 text-xs font-mono text-slate-700 select-all overflow-x-auto break-all">
                {typeof window !== 'undefined' ? `${window.location.origin}/?table=${tableForQrModal.replace(/[^0-9]/g, '')}` : ''}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const origin = typeof window !== 'undefined' ? window.location.origin : ''
                    const url = `${origin}/?table=${tableForQrModal.replace(/[^0-9]/g, '')}`
                    navigator.clipboard.writeText(url)
                    setCopiedTableUrl(true)
                    setTimeout(() => setCopiedTableUrl(false), 2000)
                  }}
                  className="flex-1 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedTableUrl ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700">คัดลอกแล้ว!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>คัดลอกลิงก์</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    const numOnly = tableForQrModal.replace(/[^0-9]/g, '')
                    window.open(`/?table=${numOnly}`, '_blank')
                  }}
                  className="flex-1 h-10 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>เปิดทดสอบ</span>
                </button>
              </div>

              <button
                onClick={() => {
                  const origin = typeof window !== 'undefined' ? window.location.origin : ''
                  const numOnly = tableForQrModal.replace(/[^0-9]/g, '')
                  const url = `${origin}/?table=${numOnly}`
                  const shopName = shopSettings?.shopName || 'ร้านอาหาร'
                  const printWin = window.open('', '_blank', 'width=450,height=600')
                  if (printWin) {
                    printWin.document.write(`
                      <!DOCTYPE html>
                      <html>
                      <head>
                        <title>QR Code ${tableForQrModal} - ${shopName}</title>
                        <meta charset="utf-8">
                        <style>
                          body { font-family: sans-serif; text-align: center; padding: 30px; margin: 0; }
                          h1 { font-size: 24px; margin-bottom: 4px; }
                          h2 { font-size: 32px; margin: 10px 0; color: #1e293b; font-weight: 900; }
                          p { font-size: 14px; color: #64748b; margin-bottom: 20px; }
                          img { width: 280px; height: 280px; margin: 0 auto; display: block; }
                          .footer { margin-top: 24px; font-size: 12px; color: #94a3b8; }
                          @media print {
                            button { display: none; }
                          }
                        </style>
                      </head>
                      <body>
                        <h1>${shopName}</h1>
                        <h2>${tableForQrModal}</h2>
                        <p>สแกน QR Code เพื่อสั่งอาหารผ่านมือถือ</p>
                        <img src="${tableQrDataUrl}" alt="QR Code" />
                        <div class="footer">${url}</div>
                        <br/>
                        <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">พิมพ์ QR โค้ด</button>
                        <script>
                          setTimeout(() => { window.print(); }, 400);
                        </script>
                      </body>
                      </html>
                    `)
                    printWin.document.close()
                  }
                }}
                className="w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>พิมพ์ QR สำหรับติดโต๊ะ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Check Bill Confirmation Sub-Modal --- */}
      {selectedTableForBilling && (
        <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[92vh] overflow-y-auto p-5 shadow-2xl border border-slate-200 space-y-4">
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
            {(() => {
              const activeOrders = getActiveOrdersForTable(selectedTableForBilling)
              const session = tableSessions[selectedTableForBilling]
              const totalAmount = activeOrders.reduce((sum, o) => sum + o.grandTotal, 0) || (session?.totalAmount || 0)
              const customerChosenMethod = session?.paymentMethod || activeOrders.find(o => o.paymentMethod)?.paymentMethod
              const isLocked = isPaymentMethodLocked && !!customerChosenMethod

              return (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <span>ช่องทางการชำระเงิน:</span>
                      {customerChosenMethod && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1">
                          <Lock className="w-3 h-3 text-indigo-600" />
                          <span>ลูกค้าเลือกล่วงหน้าแล้ว</span>
                        </span>
                      )}
                    </label>

                    {customerChosenMethod && isLocked && (
                      <button
                        type="button"
                        onClick={() => setIsPaymentMethodLocked(false)}
                        className="text-[11px] text-slate-500 hover:text-indigo-600 underline font-semibold cursor-pointer"
                        title="คลิกหากลูกค้าต้องการเปลี่ยนช่องทางชำระเงินที่หน้าร้าน"
                      >
                        เปลี่ยนช่องทางชำระ
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* CASH BUTTON */}
                    <button
                      type="button"
                      disabled={isLocked && customerChosenMethod !== 'cash'}
                      onClick={() => setBillingPaymentMethod('cash')}
                      className={`p-3 rounded-2xl border text-left flex items-center gap-2 transition-all ${
                        isLocked && customerChosenMethod !== 'cash'
                          ? 'opacity-40 cursor-not-allowed bg-slate-100 border-slate-200 text-slate-400'
                          : billingPaymentMethod === 'cash'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-300 cursor-pointer'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer'
                      }`}
                    >
                      <Banknote className="w-5 h-5 flex-shrink-0" />
                      <div className="flex-1 truncate">
                        <div className="font-extrabold text-xs flex items-center justify-between">
                          <span>เงินสด</span>
                          {customerChosenMethod === 'cash' && (
                            <span className="text-[9px] bg-white/20 px-1.5 py-0.2 rounded font-black">
                              ลูกค้าเลือก
                            </span>
                          )}
                          {isLocked && customerChosenMethod !== 'cash' && (
                            <Lock className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </div>
                        <div className={`text-[10px] ${billingPaymentMethod === 'cash' ? 'text-emerald-100' : 'text-slate-400'}`}>
                          {isLocked && customerChosenMethod !== 'cash' ? 'ถูกล็อกไว้' : 'รับเงินสดหน้าร้าน'}
                        </div>
                      </div>
                    </button>

                    {/* PROMPTPAY BUTTON */}
                    <button
                      type="button"
                      disabled={isLocked && customerChosenMethod !== 'promptpay'}
                      onClick={() => setBillingPaymentMethod('promptpay')}
                      className={`p-3 rounded-2xl border text-left flex items-center gap-2 transition-all ${
                        isLocked && customerChosenMethod !== 'promptpay'
                          ? 'opacity-40 cursor-not-allowed bg-slate-100 border-slate-200 text-slate-400'
                          : billingPaymentMethod === 'promptpay'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-300 cursor-pointer'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer'
                      }`}
                    >
                      <QrCode className="w-5 h-5 flex-shrink-0" />
                      <div className="flex-1 truncate">
                        <div className="font-extrabold text-xs flex items-center justify-between">
                          <span>พร้อมเพย์ QR</span>
                          {customerChosenMethod === 'promptpay' && (
                            <span className="text-[9px] bg-white/20 px-1.5 py-0.2 rounded font-black">
                              ลูกค้าเลือก
                            </span>
                          )}
                          {isLocked && customerChosenMethod !== 'promptpay' && (
                            <Lock className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </div>
                        <div className={`text-[10px] ${billingPaymentMethod === 'promptpay' ? 'text-blue-100' : 'text-slate-400'}`}>
                          {isLocked && customerChosenMethod !== 'promptpay' ? 'ถูกล็อกไว้' : 'โอนเงิน / สแกนจ่าย'}
                        </div>
                      </div>
                    </button>
                  </div>

                  {isLocked && customerChosenMethod && (
                    <div className="mt-1.5 text-[11px] text-indigo-700 font-medium flex items-center gap-1">
                      <Lock className="w-3 h-3 text-indigo-500" />
                      <span>
                        ล็อกตามที่ลูกค้าเลือกจากหน้าสั่งอาหาร ({customerChosenMethod === 'promptpay' ? 'พร้อมเพย์ QR' : 'เงินสด / เช็คบิลหน้าร้าน'}) ไม่ต้องกดซ้ำซ้อน
                      </span>
                    </div>
                  )}

                  {/* PROMPTPAY QR DISPLAY */}
                  {billingPaymentMethod === 'promptpay' && (
                    <div className="mt-3 bg-gradient-to-b from-blue-50/90 to-slate-50 border border-blue-200 rounded-2xl p-4 text-center space-y-3 animate-fade-in shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-blue-900 flex items-center gap-1.5">
                          <QrCode className="w-4 h-4 text-blue-600" />
                          <span>สแกนพร้อมเพย์ QR ชำระค่าอาหาร</span>
                        </span>
                        <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-blue-600 text-white shadow-2xs">
                          {totalAmount} ฿
                        </span>
                      </div>

                      <div className="inline-block bg-white p-3 rounded-2xl border border-blue-200 shadow-md">
                        {billingQrUrl ? (
                          <img
                            src={billingQrUrl}
                            alt="PromptPay QR Code"
                            className="w-48 h-48 sm:w-52 sm:h-52 mx-auto object-contain"
                          />
                        ) : (
                          <div className="w-48 h-48 sm:w-52 sm:h-52 flex flex-col items-center justify-center text-slate-400 text-xs">
                            <QrCode className="w-8 h-8 animate-pulse text-blue-400 mb-2" />
                            <span>กำลังสร้าง QR Code...</span>
                          </div>
                        )}
                      </div>

                      <div className="p-2.5 bg-white rounded-xl border border-blue-100 flex items-center justify-between text-xs">
                        <div className="text-left">
                          <span className="text-[11px] text-slate-500 block">เบอร์พร้อมเพย์:</span>
                          <span className="font-black text-slate-900 text-sm">
                            {shopSettings.promptpayPhone || '0812345678'}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            {shopSettings.shopName || 'ร้านหม่าล่าทอด ตุ่นฟินเว่อร์'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const phone = shopSettings.promptpayPhone || '0812345678'
                            navigator.clipboard.writeText(phone)
                            setCopiedPromptPay(true)
                            setTimeout(() => setCopiedPromptPay(false), 2000)
                          }}
                          className="py-1.5 px-3 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          {copiedPromptPay ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700 font-bold">คัดลอกแล้ว</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>คัดลอกเบอร์</span>
                            </>
                          )}
                        </button>
                      </div>

                      <p className="text-[11px] text-slate-500">
                        * ลูกค้าเปิดแอปธนาคารแล้วสแกน QR นี้ ยอดเงิน <strong>{totalAmount} ฿</strong> จะขึ้นให้อัตโนมัติทันที
                      </p>
                    </div>
                  )}

                  {/* CASH CALCULATOR DISPLAY */}
                  {billingPaymentMethod === 'cash' && (
                    <div className="mt-3 bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5 animate-fade-in text-xs">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-slate-700 flex items-center gap-1">
                          <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                          <span>รับเงินสดมา (บาท):</span>
                        </label>
                        {parseFloat(cashReceived) > 0 && (
                          <span className="font-black text-emerald-700">
                            เงินทอน: {Math.max(0, parseFloat(cashReceived) - totalAmount)} ฿
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={cashReceived}
                          onChange={(e) => setCashReceived(e.target.value)}
                          placeholder={`ขั้นต่ำ ${totalAmount}`}
                          className="flex-1 h-10 px-3 text-base font-black text-slate-900 bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() => setCashReceived(String(totalAmount))}
                          className="px-3 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-xs border border-emerald-300 transition-colors cursor-pointer"
                        >
                          พอดี
                        </button>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                        {[50, 100, 500, 1000].map((note) => (
                          <button
                            key={note}
                            type="button"
                            onClick={() => setCashReceived(String(note))}
                            className="py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-lg border border-slate-200 shadow-2xs cursor-pointer"
                          >
                            {note} ฿
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}

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

            {selectedTableOrders.orders.length > 1 && (
              <div className="px-5 py-2.5 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between gap-3">
                <div className="text-xs font-bold text-indigo-900">
                  มี {selectedTableOrders.orders.length} บิลในโต๊ะนี้
                </div>
                <button
                  type="button"
                  onClick={() => handlePrintCombinedTableReceipt(selectedTableOrders.table, selectedTableOrders.orders)}
                  className="py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black text-xs flex items-center gap-1.5 shadow-sm shadow-indigo-200 transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>พิมพ์ใบเสร็จรวมทั้งโต๊ะ ({selectedTableOrders.orders.reduce((sum, o) => sum + o.grandTotal, 0)} ฿)</span>
                </button>
              </div>
            )}

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
                        className="hidden"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>

                      <div className="grid grid-cols-3 gap-1.5 mt-1">
                        <button
                          type="button"
                          onClick={() => setEditingOrderForTable(order)}
                          className="py-2 px-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-bold text-[11px] flex items-center justify-center gap-1 active:scale-[0.99] transition-all cursor-pointer shadow-2xs"
                          title="แก้ไขบิล ปรับราคา หรือเปลี่ยนเมนู"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>แก้ไขบิล</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openReceiptModal(order)}
                          className="py-2 px-2 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold text-[11px] flex items-center justify-center gap-1 hover:bg-slate-100 active:scale-[0.99] transition-all cursor-pointer shadow-2xs"
                          title="พิมพ์ใบเสร็จบิลนี้"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>พิมพ์ใบเสร็จ</span>
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (window.confirm(`ยืนยันการลบบิล ${order.orderNumber} หรือไม่?\nยอดเงิน ${order.grandTotal} บาทจะถูกหักออกจากโต๊ะนี้`)) {
                              await deleteExistingOrder(order.id)
                              const orders = await db.orders.toArray()
                              setAllRecentOrders(orders)
                              if (selectedTableOrders) {
                                const updated = orders.filter(o => {
                                  const isMatch = o.tableNumber === selectedTableOrders.table || o.tableOrQueue === selectedTableOrders.table
                                  return isMatch && o.status !== 'cancelled' && o.id !== order.id
                                })
                                setSelectedTableOrders({
                                  table: selectedTableOrders.table,
                                  orders: updated
                                })
                              }
                            }
                          }}
                          className="py-2 px-2 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-bold text-[11px] flex items-center justify-center gap-1 active:scale-[0.99] transition-all cursor-pointer shadow-2xs"
                          title="ลบบิลนี้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>ลบบิล</span>
                        </button>
                      </div>
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

      {/* Edit Order Modal */}
      <EditOrderModal
        order={editingOrderForTable}
        isOpen={!!editingOrderForTable}
        onClose={() => setEditingOrderForTable(null)}
        onSaveSuccess={async () => {
          setEditingOrderForTable(null)
          const orders = await db.orders.toArray()
          setAllRecentOrders(orders)
          if (selectedTableOrders) {
            const updated = orders.filter(o => {
              const isMatch = o.tableNumber === selectedTableOrders.table || o.tableOrQueue === selectedTableOrders.table
              return isMatch && o.status !== 'cancelled'
            })
            setSelectedTableOrders({
              table: selectedTableOrders.table,
              orders: updated
            })
          }
        }}
        onDeleteSuccess={async () => {
          setEditingOrderForTable(null)
          const orders = await db.orders.toArray()
          setAllRecentOrders(orders)
          if (selectedTableOrders) {
            const updated = orders.filter(o => {
              const isMatch = o.tableNumber === selectedTableOrders.table || o.tableOrQueue === selectedTableOrders.table
              return isMatch && o.status !== 'cancelled'
            })
            setSelectedTableOrders({
              table: selectedTableOrders.table,
              orders: updated
            })
          }
        }}
      />
    </div>
  )
}
