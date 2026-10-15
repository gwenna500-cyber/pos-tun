import React, { useState, useMemo, useEffect } from 'react'
import { 
  Flame, 
  Clock, 
  Phone, 
  User, 
  Plus, 
  Minus, 
  X, 
  Check, 
  QrCode, 
  Banknote, 
  Send, 
  MessageCircle, 
  CheckCircle2, 
  UtensilsCrossed,
  Lock,
  Sparkles,
  Receipt,
  ChefHat,
  Copy
} from 'lucide-react'
import confetti from 'canvas-confetti'
import { usePosStore } from '../store/usePosStore'
import { db } from '../lib/db'
import { MENU_CATEGORIES, DEFAULT_LINE_OA_SETTINGS, SPICY_LEVELS } from '../lib/constants'
import { isFirebaseReady, subscribeToFirebaseOrders } from '../lib/firebase'
import { generatePromptPayQrDataUrl } from '../lib/promptpay'
import { getLineDirectShareUrl } from '../lib/lineNotify'
import type { MenuItem, CartItem, SpicyLevel, PaymentMethod, Order, DiningType } from '../types'

export const LineTakeawayOrderView: React.FC = () => {
  const { 
    menuItems, 
    spicyOptions, 
    shopSettings, 
    tableSessions,
    submitCustomerOrder
  } = usePosStore()

  const lineSettings = shopSettings.lineOaSettings || DEFAULT_LINE_OA_SETTINGS

  // Read URL query parameters to auto-detect Dine-in Table vs Takeaway
  const initialParams = useMemo(() => {
    if (typeof window === 'undefined') return { diningType: 'takeaway' as DiningType, table: 'โต๊ะ 1' }
    const sp = new URLSearchParams(window.location.search)
    const hp = new URLSearchParams(window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '')
    const t = sp.get('table') || hp.get('table')
    const mode = sp.get('mode') || hp.get('mode')

    if (t) {
      const cleanTable = t.startsWith('โต๊ะ') ? t : `โต๊ะ ${t}`
      return { diningType: 'dine_in' as DiningType, table: cleanTable }
    }
    if (mode === 'table') {
      return { diningType: 'dine_in' as DiningType, table: 'โต๊ะ 1' }
    }
    return { diningType: 'takeaway' as DiningType, table: 'โต๊ะ 1' }
  }, [])

  // Order mode: 'dine_in' (Table QR) or 'takeaway' (LINE takeaway)
  const diningType = initialParams.diningType
  const tableNumber = initialParams.table

  // Real-time table session status
  const cleanTableNumber = useMemo(() => {
    return tableNumber.trim().startsWith('โต๊ะ') ? tableNumber.trim() : `โต๊ะ ${tableNumber.trim()}`
  }, [tableNumber])

  const currentTableSession = tableSessions[cleanTableNumber]
  const isTableBilled = useMemo(() => {
    if (diningType !== 'dine_in') return false
    return currentTableSession?.status === 'billed'
  }, [diningType, currentTableSession])

  // Local customer cart
  const [customerCart, setCustomerCart] = useState<CartItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  // Item Options Modal / Bottom Sheet
  const [activeItem, setActiveItem] = useState<MenuItem | null>(null)
  const [itemQty, setItemQty] = useState<number>(1)
  const [itemNote, setItemNote] = useState<string>('')

  // Checkout Sheet
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [pickupOption, setPickupOption] = useState<string>('asap')
  const [customPickupTime, setCustomPickupTime] = useState('')
  const [orderNotes, setOrderNotes] = useState('')
  const [checkoutSpicy, setCheckoutSpicy] = useState<string>('medium')
  const [customerOrderAddons, setCustomerOrderAddons] = useState<string[]>([])
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    initialParams.diningType === 'dine_in' ? 'cash' : 'promptpay'
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  const toggleCustomerOrderAddon = (addonName: string) => {
    setCustomerOrderAddons(prev =>
      prev.includes(addonName) ? prev.filter(a => a !== addonName) : [...prev, addonName]
    )
  }

  // Order Success Screen
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null)
  const [promptPayQrUrl, setPromptPayQrUrl] = useState<string>('')
  const [tableBilledQrUrl, setTableBilledQrUrl] = useState<string>('')
  const [showHistoryQr, setShowHistoryQr] = useState<boolean>(false)
  const [copiedPromptPay, setCopiedPromptPay] = useState(false)

  // Orders history for this table / customer
  const [tableOrders, setTableOrders] = useState<Order[]>([])
  const [isOrderHistoryOpen, setIsOrderHistoryOpen] = useState(false)

  const isOrderMatchingCustomer = (o: Order) => {
    if (diningType === 'dine_in') {
      const isMatchTable = o.tableNumber === cleanTableNumber || o.tableOrQueue === cleanTableNumber
      if (!isMatchTable || o.status === 'cancelled') return false

      if (currentTableSession) {
        // Table was cleared and is currently available -> no orders in this new session yet
        if (currentTableSession.status === 'available') {
          return false
        }

        // 1. If both order and table session have sessionId, they must strictly match!
        if (currentTableSession.sessionId && o.tableSessionId) {
          return o.tableSessionId === currentTableSession.sessionId
        }

        // 2. If order has no sessionId, it must have been placed after this session opened
        if (currentTableSession.openedAt) {
          return o.createdAt >= currentTableSession.openedAt - 15000
        }

        // 3. If order is already completed from an old checkout, do not show it
        if (o.status === 'completed') {
          return false
        }
      }

      // Fallback if no table session is tracked yet: only active (uncompleted) orders from the last 2 hours
      return o.status !== 'completed' && Date.now() - o.createdAt < 2 * 60 * 60 * 1000
    } else {
      const savedIds: string[] = JSON.parse(localStorage.getItem('my_takeaway_order_ids') || '[]')
      return savedIds.includes(o.id) || (customerPhone && o.customerPhone === customerPhone)
    }
  }

  const loadTableOrders = async () => {
    try {
      const allDbOrders = await db.orders.toArray()
      const matchingOrders = allDbOrders.filter(isOrderMatchingCustomer)
      matchingOrders.sort((a, b) => b.createdAt - a.createdAt)
      setTableOrders(matchingOrders)
    } catch (e) {
      console.warn('Could not load table orders:', e)
    }
  }

  useEffect(() => {
    loadTableOrders()

    let unsubscribeFirebase: (() => void) | undefined
    if (isFirebaseReady()) {
      unsubscribeFirebase = subscribeToFirebaseOrders((cloudOrders) => {
        const matching = cloudOrders.filter(isOrderMatchingCustomer)
        matching.sort((a, b) => b.createdAt - a.createdAt)
        setTableOrders(matching)
      })
    }

    const interval = setInterval(loadTableOrders, 5000)
    const handleStorage = () => loadTableOrders()
    window.addEventListener('storage', handleStorage)

    return () => {
      clearInterval(interval)
      if (unsubscribeFirebase) unsubscribeFirebase()
      window.removeEventListener('storage', handleStorage)
    }
  }, [cleanTableNumber, diningType, customerPhone, currentTableSession])

  const totalItemsOrdered = useMemo(() => {
    return tableOrders.reduce((sum, o) => sum + o.totalItemsCount, 0)
  }, [tableOrders])

  const totalTableOrderedAmount = useMemo(() => {
    return tableOrders.reduce((sum, o) => sum + o.grandTotal, 0) || (currentTableSession?.totalAmount || 0)
  }, [tableOrders, currentTableSession?.totalAmount])

  // Generate PromptPay QR for billed table or history drawer
  useEffect(() => {
    if (totalTableOrderedAmount > 0) {
      const phone = shopSettings.promptpayPhone || '0812345678'
      generatePromptPayQrDataUrl(phone, totalTableOrderedAmount).then(url => {
        setTableBilledQrUrl(url)
      })
    }
  }, [totalTableOrderedAmount, shopSettings.promptpayPhone])

  // Filtered menu
  const filteredItems = useMemo(() => {
    return menuItems.filter(item => {
      if (item.isAvailable === false) return false
      return selectedCategory === 'all' || item.category === selectedCategory
    })
  }, [menuItems, selectedCategory])

  const totalCartCount = customerCart.reduce((sum, item) => sum + item.quantity, 0)
  const totalCartPrice = customerCart.reduce((sum, item) => sum + item.price * item.quantity, 0)

  // Available spicy options (authentic spice levels only; chosen at checkout)
  const activeSpicyOptions = useMemo(() => {
    return spicyOptions.filter(s => s.isAvailable !== false && s.id !== 'dry' && s.id !== 'extra_sesame')
  }, [spicyOptions])

  // Handle open item sheet for quantity & notes
  const handleItemClick = (item: MenuItem) => {
    if (item.category === 'drink') {
      // Direct add drinks
      addItemToCustomerCart(item, 'none', '', 1, [])
    } else {
      setActiveItem(item)
      setItemQty(1)
      setItemNote('')
    }
  }

  const addItemToCustomerCart = (
    item: MenuItem, 
    spicyLevel: SpicyLevel, 
    note: string, 
    quantity: number, 
    addons: string[] = []
  ) => {
    const sortedAddons = [...addons].sort()
    const addonsKey = JSON.stringify(sortedAddons)

    setCustomerCart(prev => {
      const idx = prev.findIndex(
        c => c.menuItemId === item.id && 
             c.spicyLevel === spicyLevel && 
             JSON.stringify([...(c.addons || [])].sort()) === addonsKey &&
             (c.note || '') === (note || '')
      )

      if (idx > -1) {
        const next = [...prev]
        next[idx] = { ...next[idx], quantity: next[idx].quantity + quantity }
        return next
      } else {
        const newItem: CartItem = {
          cartItemId: `cust-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          menuItemId: item.id,
          name: item.name,
          price: item.price,
          quantity,
          spicyLevel,
          category: item.category,
          note,
          addons: sortedAddons
        }
        return [...prev, newItem]
      }
    })
  }

  const handleConfirmAddItem = () => {
    if (!activeItem) return
    addItemToCustomerCart(activeItem, 'none', itemNote.trim(), itemQty, [])
    setActiveItem(null)
  }

  const handleUpdateQty = (cartItemId: string, delta: number) => {
    setCustomerCart(prev => {
      return prev
        .map(i => i.cartItemId === cartItemId ? { ...i, quantity: i.quantity + delta } : i)
        .filter(i => i.quantity > 0)
    })
  }

  // Calculate estimated pickup time text for takeaway
  const getCalculatedPickupTime = () => {
    const now = new Date()
    const interval = lineSettings.pickupIntervalMinutes || 15
    if (pickupOption === 'asap') {
      const pickupDate = new Date(now.getTime() + interval * 60000)
      return `เร็วที่สุด (~${interval} นาที) ประมาณ ${pickupDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`
    } else if (pickupOption === '30m') {
      const pickupDate = new Date(now.getTime() + 30 * 60000)
      return `อีก 30 นาที (~${pickupDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.)`
    } else if (pickupOption === '45m') {
      const pickupDate = new Date(now.getTime() + 45 * 60000)
      return `อีก 45 นาที (~${pickupDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.)`
    } else if (pickupOption === 'custom' && customPickupTime) {
      return `${customPickupTime} น.`
    }
    return `เร็วที่สุด (~${interval} นาที)`
  }

  // Handle final submit
  const handleCustomerSubmitOrder = async () => {
    if (customerCart.length === 0) return

    // Validation for Takeaway vs Dine-In
    if (diningType === 'takeaway') {
      if (!customerName.trim()) {
        alert('โปรดระบุชื่อของคุณ เพื่อให้ทางร้านเรียกคิวได้ถูกต้องครับ')
        return
      }
      if (!customerPhone.trim() || customerPhone.replace(/[^0-9]/g, '').length < 9) {
        alert('โปรดระบุเบอร์โทรศัพท์ที่ติดต่อได้ (อย่างน้อย 9-10 หลัก) ครับ')
        return
      }
    } else {
      // Dine-In Table order
      if (!tableNumber.trim()) {
        alert('โปรดระบุหมายเลขโต๊ะของคุณ (เช่น โต๊ะ 1) ครับ')
        return
      }
      if (isTableBilled) {
        alert('โต๊ะนี้เช็คบิลเรียบร้อยแล้ว ไม่สามารถส่งออเดอร์เพิ่มได้ กรุณาติดต่อพนักงานครับ')
        return
      }
    }

    setIsSubmitting(true)
    try {
      const isDineIn = diningType === 'dine_in'
      const cleanTable = tableNumber.trim().startsWith('โต๊ะ') ? tableNumber.trim() : `โต๊ะ ${tableNumber.trim()}`

      const order = await submitCustomerOrder({
        diningType,
        tableNumber: isDineIn ? cleanTable : undefined,
        customerName: isDineIn 
          ? (customerName.trim() || cleanTable)
          : customerName.trim(),
        customerPhone: customerPhone.trim(),
        pickupTime: isDineIn ? undefined : getCalculatedPickupTime(),
        notes: orderNotes.trim(),
        items: customerCart,
        paymentMethod,
        paymentStatus: paymentMethod === 'promptpay' ? 'paid' : 'pending',
        orderAddons: customerOrderAddons,
        spicyLevel: checkoutSpicy
      })

      // Save customer session token locally
      if (order.tableSessionId) {
        try {
          localStorage.setItem(`pos_session_${cleanTable}`, order.tableSessionId)
        } catch {}
      }

      // Generate promptpay QR if promptpay selected
      if (paymentMethod === 'promptpay') {
        const phone = shopSettings.promptpayPhone || '0812345678'
        generatePromptPayQrDataUrl(phone, order.grandTotal).then(setPromptPayQrUrl)
      }

      setCompletedOrder(order)
      setIsCheckoutOpen(false)
      setCustomerCart([])
      setCustomerOrderAddons([])

      if (!isDineIn) {
        try {
          const savedIds: string[] = JSON.parse(localStorage.getItem('my_takeaway_order_ids') || '[]')
          savedIds.push(order.id)
          localStorage.setItem('my_takeaway_order_ids', JSON.stringify(savedIds))
        } catch {}
      }
      loadTableOrders()

      try {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } })
      } catch {}
    } catch (err: any) {
      alert(`ไม่สามารถส่งออเดอร์ได้: ${err.message || 'โปรดลองอีกครั้ง'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  // --- Render Order Success Screen ---
  if (completedOrder) {
    const isDineIn = completedOrder.diningType === 'dine_in'
    const lineShareUrl = getLineDirectShareUrl(completedOrder, lineSettings, shopSettings.shopName)

    return (
      <div className="min-h-screen bg-slate-100 flex flex-col justify-between p-4 sm:p-6 animate-fade-in max-w-lg mx-auto">
        <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-200 text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              {isDineIn ? 'ส่งออเดอร์เข้าครัวสำเร็จ!' : 'สั่งกลับบ้านสำเร็จ!'}
            </span>
            <h2 className="text-2xl font-black text-slate-900 mt-2">
              {isDineIn ? 'ครัวได้รับออเดอร์ของคุณแล้ว!' : 'ร้านได้รับออเดอร์ของคุณแล้ว!'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {isDineIn 
                ? `แม่ครัวกำลังปรุงหม่าล่าทอดร้อนๆ เตรียมไปเสิร์ฟที่ ${completedOrder.tableOrQueue} ครับ` 
                : 'กำลังเตรียมหม่าล่าทอดกรอบสูตรเด็ดให้คุณ มารับตามเวลานัดได้เลยครับ'}
            </p>
          </div>

          {/* Huge Queue Card */}
          <div className="bg-gradient-to-br from-red-600 to-red-700 text-white rounded-2xl p-4 shadow-md text-center">
            <span className="text-xs font-bold text-red-100 uppercase tracking-wider">
              {isDineIn ? 'หมายเลขคิวของคุณ' : 'หมายเลขคิวรับอาหาร'}
            </span>
            <div className="text-5xl font-black my-1 tracking-tight">
              {completedOrder.orderNumber}
            </div>
            <div className="text-sm text-red-100 font-extrabold flex items-center justify-center gap-1.5 mt-1">
              {isDineIn ? (
                <span>🍽️ {completedOrder.tableOrQueue} (นั่งทานที่ร้าน)</span>
              ) : (
                <span>👤 คุณ: {completedOrder.customerName} · ⏰ รับ: {completedOrder.pickupTime}</span>
              )}
            </div>
            <div className="mt-2 pt-2 border-t border-red-500/40 text-xs text-red-100 flex items-center justify-center gap-1.5 flex-wrap">
              <span className="font-bold">🔥 ความเผ็ด:</span>
              <span className="bg-white/20 px-2 py-0.5 rounded-md font-bold">
                {spicyOptions.find(s => s.id === completedOrder.spicyLevel)?.label.split(' ')[0] || completedOrder.spicyLevel || 'เผ็ดกลาง'}
              </span>
              {completedOrder.orderAddons && completedOrder.orderAddons.length > 0 && (
                <>
                  <span className="font-bold ml-1.5">✨ พิเศษ:</span>
                  {completedOrder.orderAddons.map((addon, idx) => (
                    <span key={idx} className="bg-white/20 px-2 py-0.5 rounded-md font-bold">
                      {addon.includes('งา') ? `🌾 ${addon}` : addon.includes('กรอบ') ? `🍟 ${addon}` : addon}
                    </span>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* PromptPay QR Section (if paying with promptpay) */}
          {completedOrder.paymentMethod === 'promptpay' && (
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-700 block">
                สแกนชำระเงินผ่านพร้อมเพย์ ({completedOrder.grandTotal} ฿)
              </span>
              {promptPayQrUrl ? (
                <div className="inline-block bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs">
                  <img src={promptPayQrUrl} alt="PromptPay QR" className="w-44 h-44 mx-auto object-contain" />
                </div>
              ) : (
                <div className="w-44 h-44 flex items-center justify-center mx-auto text-xs text-slate-400">
                  กำลังสร้าง QR...
                </div>
              )}
              <div className="flex items-center justify-center gap-1.5 text-xs text-slate-600">
                <span>พร้อมเพย์:</span>
                <strong className="text-slate-800">{shopSettings.promptpayPhone || '0812345678'}</strong>
                <span className="text-slate-400 text-[11px]">({shopSettings.shopName || 'ร้านหม่าล่าทอด ตุ่นฟินเว่อร์'})</span>
                <button
                  type="button"
                  onClick={() => {
                    const phone = shopSettings.promptpayPhone || '0812345678'
                    navigator.clipboard.writeText(phone)
                    setCopiedPromptPay(true)
                    setTimeout(() => setCopiedPromptPay(false), 2000)
                  }}
                  className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800 cursor-pointer"
                  title="คัดลอกเบอร์"
                >
                  {copiedPromptPay ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}

          {/* Dine-In Pay at Counter Notice */}
          {isDineIn && completedOrder.paymentMethod === 'cash' && (
            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 leading-relaxed text-left">
              <span className="font-bold block mb-0.5">ℹ️ วิธีการชำระเงิน:</span>
              นั่งรับประทานอาหารที่โต๊ะได้ตามสบายเลยนะคะ เมื่อทานเสร็จเรียบร้อยแล้ว แจ้งหมายเลข <strong>{completedOrder.tableOrQueue}</strong> เพื่อเช็กบิลที่เคาน์เตอร์หน้าร้านได้เลยครับ
            </div>
          )}

          {/* Ordered items brief */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs space-y-2">
            <div className="flex justify-between items-center pb-1 border-b border-slate-200/80">
              <span className="font-bold text-slate-700">
                รายการที่สั่ง ({completedOrder.totalItemsCount} รายการ):
              </span>
              <span className="text-slate-500 font-semibold text-[11px]">
                {completedOrder.orderNumber}
              </span>
            </div>

            {/* Spicy Level Badge */}
            {completedOrder.spicyLevel && (
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-red-50 text-red-950 border border-red-200 font-bold">
                <span className="flex items-center gap-1.5 text-[11px] text-red-800">
                  <Flame className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                  <span>ระดับความเผ็ด:</span>
                </span>
                <span className="px-2 py-0.5 rounded-md bg-red-600 text-white font-black text-[11px] shadow-2xs">
                  {spicyOptions.find(s => s.id === completedOrder.spicyLevel)?.label || completedOrder.spicyLevel}
                </span>
              </div>
            )}

            {/* Addons */}
            {completedOrder.orderAddons && completedOrder.orderAddons.length > 0 && (
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-amber-50 text-amber-950 border border-amber-200 font-bold">
                <span className="flex items-center gap-1 text-[11px] text-amber-800">
                  <Sparkles className="w-3 h-3 text-amber-600 flex-shrink-0" />
                  <span>ตัวเลือกพิเศษ:</span>
                </span>
                <div className="flex gap-1 flex-wrap justify-end">
                  {completedOrder.orderAddons.map((addon, aIdx) => (
                    <span key={aIdx} className="px-2 py-0.5 rounded-md bg-white border border-amber-300 text-amber-900 text-[10px] font-bold shadow-2xs">
                      {addon.includes('งา') ? `🌾 ${addon}` : addon.includes('กรอบ') ? `🍟 ${addon}` : addon}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Order Notes */}
            {completedOrder.notes && (
              <div className="px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-[11px] border border-slate-200">
                <span className="font-bold text-slate-800">📝 โน้ตเพิ่มเติม:</span> {completedOrder.notes}
              </div>
            )}

            {/* Items */}
            <div className="divide-y divide-slate-200/60 pt-0.5">
              {completedOrder.items.map((item, idx) => (
                <div key={idx} className="py-1 flex justify-between text-slate-600">
                  <span className="truncate flex-1">{item.name} ×{item.quantity}</span>
                  <span className="font-semibold text-slate-900">{item.price * item.quantity} ฿</span>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-200 pt-1.5 flex justify-between font-black text-slate-900">
              <span>ยอดรวมทั้งสิ้น:</span>
              <span className="text-emerald-600 text-sm">{completedOrder.grandTotal} ฿</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            {/* If Dine-In: Button to order more food to the same table, or Locked Notice if billed */}
            {isDineIn ? (
              isTableBilled ? (
                <div className="w-full p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-center space-y-1 animate-fade-in shadow-2xs">
                  <div className="flex items-center justify-center gap-1.5 font-black text-sm text-amber-800">
                    <Lock className="w-4 h-4 text-amber-600" />
                    <span>โต๊ะนี้เช็คบิลเรียบร้อยแล้ว</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-normal">
                    พนักงานได้ทำการเช็คบิลปิดรอบแล้ว ขอบคุณที่มาอุดหนุนครับ! ไม่สามารถสั่งอาหารเพิ่มเติมในรอบนี้ได้
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setCompletedOrder(null)
                      setPromptPayQrUrl('')
                    }}
                    className="w-full py-3.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md shadow-red-200 transition-all cursor-pointer"
                  >
                    <Plus className="w-5 h-5" />
                    <span>🥢 สั่งอาหารเพิ่มที่ {completedOrder.tableOrQueue}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCompletedOrder(null)
                      setIsOrderHistoryOpen(true)
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Receipt className="w-4 h-4 text-indigo-600" />
                    <span>📋 ดูประวัติอาหารที่สั่งทั้งหมดของโต๊ะนี้</span>
                  </button>
                </div>
              )
            ) : (
              <div className="space-y-2">
                <a
                  href={lineShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 px-4 rounded-xl bg-[#06C755] hover:bg-[#05b34c] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-200 transition-all cursor-pointer"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>ส่งบิลยืนยันเข้า LINE ทางร้าน</span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    setCompletedOrder(null)
                    setIsOrderHistoryOpen(true)
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Receipt className="w-4 h-4 text-slate-600" />
                  <span>📋 ดูประวัติการสั่งซื้อ</span>
                </button>
              </div>
            )}

            {shopSettings.phone && (
              <a
                href={`tel:${shopSettings.phone.replace(/[^0-9]/g, '')}`}
                className="w-full py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Phone className="w-4 h-4 text-slate-500" />
                <span>โทรติดต่อทางร้าน: {shopSettings.phone}</span>
              </a>
            )}

            {!isDineIn && (
              <button
                onClick={() => {
                  setCompletedOrder(null)
                  setPromptPayQrUrl('')
                }}
                className="text-xs text-slate-400 hover:text-slate-600 font-medium py-2 block mx-auto underline cursor-pointer"
              >
                สั่งอาหารรายการใหม่
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col max-w-2xl mx-auto pb-24">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-md shadow-red-200 flex-shrink-0">
              <Flame className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-extrabold text-slate-900 text-base leading-tight">
                  {shopSettings.brandTitle || 'ร้านหม่าล่าทอด ตุ่นฟินเว่อร์'}
                </h1>
                {diningType === 'dine_in' ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                    <UtensilsCrossed className="w-3 h-3" />
                    <span>{tableNumber}</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    🥡 สั่งกลับบ้าน
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 font-medium truncate">
                {shopSettings.shopName} · {diningType === 'dine_in' ? `สแกนสั่งที่โต๊ะอาหาร (${tableNumber})` : `LINE OA: ${lineSettings.lineOaId || '@tunfinver'}`}
              </p>
            </div>
          </div>
        </div>

        {/* Dining Type Status & Order History */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
          {diningType === 'dine_in' ? (
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center gap-1.5 shadow-xs">
                <UtensilsCrossed className="w-3.5 h-3.5" />
                <span>ทานที่ร้าน · {tableNumber}</span>
              </span>
              <span className="text-[11px] text-slate-500 hidden sm:inline">
                (รายการที่สั่งจะถูกส่งตรงเข้าห้องครัวทันที)
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs font-extrabold">
              <span className="px-3 py-1.5 rounded-lg bg-red-600 text-white shadow-xs flex items-center gap-1.5">
                <span>🥡 สั่งกลับบ้าน</span>
              </span>
            </div>
          )}

          {/* Table / Customer Order History Pill */}
          {tableOrders.length > 0 && (
            <button
              type="button"
              onClick={() => setIsOrderHistoryOpen(true)}
              className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-[11px] font-extrabold flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
              title="ดูประวัติอาหารที่สั่งไปแล้ว"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>ประวัติสั่ง ({tableOrders.length})</span>
            </button>
          )}
        </div>

        {/* Welcome & Info Banner */}
        <div className="px-4 py-2 bg-gradient-to-r from-amber-50 to-orange-50 border-t border-amber-200/60 flex items-center justify-between text-xs text-amber-900 font-medium">
          <div className="flex items-center gap-1.5 truncate">
            <Clock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
            <span className="truncate">
              {diningType === 'dine_in'
                ? `นั่งสั่งอาหารที่ ${tableNumber} ได้เลย ออเดอร์จะส่งตรงเข้าครัวทันที`
                : (lineSettings.customWelcomeNote || 'สั่งล่วงหน้า รับของหน้าร้านได้ทันที')}
            </span>
          </div>
          <span className="flex-shrink-0 text-[11px] font-bold bg-white px-2 py-0.5 rounded-md border border-amber-200 shadow-2xs">
            รอ ~{lineSettings.pickupIntervalMinutes || 15} นาที
          </span>
        </div>

        {/* Active Ordered Items Banner for Table / Customer */}
        {tableOrders.length > 0 && (
          <div className="px-4 py-2.5 bg-gradient-to-r from-indigo-50 via-blue-50 to-indigo-50 border-t border-indigo-200 flex items-center justify-between gap-2 animate-fade-in shadow-2xs">
            <div className="flex items-center gap-2 truncate">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
              <div className="truncate text-xs">
                <span className="font-black text-indigo-950">
                  {cleanTableNumber} สั่งไปแล้ว:
                </span>{' '}
                <span className="font-extrabold text-indigo-700">
                  {totalItemsOrdered} รายการ ({tableOrders.length} บิล)
                </span>{' '}
                · <span className="font-black text-emerald-600">{totalTableOrderedAmount} ฿</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOrderHistoryOpen(true)}
              className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>ดูรายการ</span>
            </button>
          </div>
        )}

        {/* Category Pills (Only when table is not billed) */}
        {!isTableBilled && (
          <div className="px-3 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-t border-slate-100 bg-white">
            {MENU_CATEGORIES.map(cat => {
              const isSelected = selectedCategory === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex-shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-red-600 text-white shadow-xs' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat.name}
                </button>
              )
            })}
          </div>
        )}
      </header>

      {/* Table Billed Locked Screen vs Food Items Catalog */}
      {isTableBilled ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto my-auto animate-fade-in py-12">
          <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center mb-4 shadow-inner">
            <Lock className="w-10 h-10" />
          </div>

          <span className="px-3.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-amber-700" />
            <span>เช็คบิลปิดรอบแล้ว</span>
          </span>

          <h2 className="text-2xl font-black text-slate-900 mt-3">
            {cleanTableNumber} เช็คบิลเรียบร้อยแล้ว
          </h2>

          <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
            โต๊ะนี้ได้รับการเช็คบิลและปิดรอบการรับประทานแล้ว จึงไม่สามารถส่งออเดอร์เพิ่มจากอุปกรณ์เครื่องนี้ได้อีก เพื่อป้องกันการสั่งอาหารซ้ำซ้อนหรือสั่งจากที่อื่น
          </p>

          {/* PromptPay QR for Billed Table */}
          {totalTableOrderedAmount > 0 && (
            <div className="mt-4 bg-white rounded-2xl p-4 border border-blue-200 text-center space-y-3 w-full shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-blue-900 flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-blue-600" />
                  <span>สแกนพร้อมเพย์ QR เช็คบิล</span>
                </span>
                <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-blue-600 text-white shadow-2xs">
                  {totalTableOrderedAmount} ฿
                </span>
              </div>

              <div className="inline-block bg-white p-2.5 rounded-2xl border border-blue-200 shadow-sm">
                {tableBilledQrUrl ? (
                  <img src={tableBilledQrUrl} alt="PromptPay QR" className="w-48 h-48 mx-auto object-contain" />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-xs text-slate-400">
                    กำลังสร้าง QR Code...
                  </div>
                )}
              </div>

              <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <div className="text-left">
                  <span className="text-[10px] text-slate-500 block">เบอร์พร้อมเพย์:</span>
                  <span className="font-bold text-slate-900">{shopSettings.promptpayPhone || '0812345678'}</span>
                  <span className="text-[10px] text-slate-400 block">{shopSettings.shopName || 'ร้านหม่าล่าทอด ตุ่นฟินเว่อร์'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const phone = shopSettings.promptpayPhone || '0812345678'
                    navigator.clipboard.writeText(phone)
                    setCopiedPromptPay(true)
                    setTimeout(() => setCopiedPromptPay(false), 2000)
                  }}
                  className="py-1 px-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {copiedPromptPay ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-700">คัดลอกแล้ว</span>
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
                สแกนได้จากทุกแอปธนาคาร ยอดเงิน <strong>{totalTableOrderedAmount} ฿</strong> จะขึ้นให้อัตโนมัติทันที
              </p>
            </div>
          )}

          <div className="mt-5 p-4 bg-white rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-2 text-left w-full shadow-xs">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>สำหรับลูกค้าท่านใหม่ที่เพิ่งมานั่งทาน:</span>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              กรุณาแจ้งพนักงานเพื่อเปิดโต๊ะใหม่ หรือรอพนักงานเคลียร์โต๊ะสักครู่ เมื่อพนักงานเปิดโต๊ะใหม่แล้ว หน้าจอนี้จะปลดล็อกให้สั่งอาหารได้อัตโนมัติทันทีครับ
            </p>
          </div>

          {shopSettings.phone && (
            <a
              href={`tel:${shopSettings.phone.replace(/[^0-9]/g, '')}`}
              className="mt-4 w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Phone className="w-4 h-4 text-slate-500" />
              <span>ติดต่อพนักงาน: {shopSettings.phone}</span>
            </a>
          )}

          {tableOrders.length > 0 && (
            <button
              type="button"
              onClick={() => setIsOrderHistoryOpen(true)}
              className="mt-3 w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Receipt className="w-4 h-4" />
              <span>📋 ดูสรุปรายการอาหารที่สั่งทั้งหมดของโต๊ะนี้ ({tableOrders.length} บิล)</span>
            </button>
          )}
        </div>
      ) : (
        /* Food Items Catalog */
        <main className="p-3 sm:p-4 space-y-2.5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {filteredItems.map(item => {
              const inCartQty = customerCart
                .filter(c => c.menuItemId === item.id)
                .reduce((s, i) => s + i.quantity, 0)

              return (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className="relative bg-white rounded-2xl p-3 border border-slate-200/90 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between active:scale-[0.98] group overflow-hidden"
                >
                  <div>
                    {item.image && (
                      <div className="w-full h-28 -mx-3 -mt-3 mb-2.5 overflow-hidden bg-slate-100 flex items-center justify-center">
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                          loading="lazy"
                        />
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded-md">
                        {MENU_CATEGORIES.find(c => c.id === item.category)?.name || 'เมนู'}
                      </span>
                      <span className="font-black text-base text-emerald-600 tracking-tight">
                        {item.price} <span className="text-xs font-bold text-emerald-600">฿</span>
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2 group-hover:text-red-600 transition-colors">
                      {item.name}
                    </h3>

                    {item.description && (
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-medium">
                      {item.category === 'drink' ? 'แตะสั่งเลย' : '+ สั่งอาหาร'}
                    </span>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                      inCartQty > 0 
                        ? 'bg-red-600 text-white font-black text-xs shadow-xs' 
                        : 'bg-slate-100 text-slate-600 group-hover:bg-red-50 group-hover:text-red-600'
                    }`}>
                      {inCartQty > 0 ? inCartQty : <Plus className="w-3.5 h-3.5" />}
                    </div>
                  </div>

                  {inCartQty > 0 && (
                    <div className="absolute inset-0 rounded-2xl border-2 border-red-500 pointer-events-none" />
                  )}
                </div>
              )
            })}
          </div>
        </main>
      )}

      {/* Floating Bottom Cart Bar */}
      {totalCartCount > 0 && !isTableBilled && (
        <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 max-w-2xl mx-auto shadow-xl">
          <button
            type="button"
            onClick={() => setIsCheckoutOpen(true)}
            className="w-full h-14 bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white rounded-2xl px-4 flex items-center justify-between shadow-lg shadow-red-200 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-black text-sm">
                {totalCartCount}
              </div>
              <div className="text-left">
                <span className="font-extrabold text-sm block leading-tight">
                  {diningType === 'dine_in' ? `ดูรายการ (${tableNumber})` : 'ดูรายการสั่งซื้อ'}
                </span>
                <span className="text-[10px] text-red-100">
                  {diningType === 'dine_in' ? 'แตะเพื่อส่งออเดอร์เข้าครัว' : 'แตะเพื่อเลือกเวลานัดรับ'}
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xl font-black">{totalCartPrice}</span>
              <span className="text-xs ml-0.5">฿</span>
            </div>
          </button>
        </div>
      )}

      {/* Floating Bottom Order History Bar (when cart is empty, but table has orders) */}
      {totalCartCount === 0 && tableOrders.length > 0 && !isTableBilled && (
        <div className="fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 max-w-2xl mx-auto shadow-xl animate-fade-in">
          <button
            type="button"
            onClick={() => setIsOrderHistoryOpen(true)}
            className="w-full h-13 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white rounded-2xl px-4 flex items-center justify-between shadow-lg shadow-indigo-200 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-black text-sm">
                <Receipt className="w-4 h-4" />
              </div>
              <div className="text-left">
                <span className="font-extrabold text-sm block leading-tight">
                  ดูอาหารที่สั่งไปแล้ว ({cleanTableNumber})
                </span>
                <span className="text-[11px] text-indigo-100 font-medium">
                  สั่งแล้ว {totalItemsOrdered} รายการ ({tableOrders.length} บิล)
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 font-black text-base text-white">
              <span>{totalTableOrderedAmount} ฿</span>
              <span className="text-xs font-normal">›</span>
            </div>
          </button>
        </div>
      )}

      {/* Item Spicy Modal (Bottom Sheet) */}
      {activeItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4 animate-fade-in">
          <div className="fixed inset-0" onClick={() => setActiveItem(null)} />
          <div className="relative z-10 bg-white w-full rounded-t-3xl sm:rounded-3xl sm:max-w-md shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden">
            {/* Mobile Drag Bar */}
            <div className="sm:hidden pt-2.5 pb-1 flex justify-center bg-slate-50">
              <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
            </div>

            {/* Item Image Banner */}
            {activeItem.image && (
              <div className="w-full h-44 bg-slate-100 overflow-hidden">
                <img
                  src={activeItem.image}
                  alt={activeItem.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Header */}
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  เลือกจำนวน & โน้ตเมนู
                </span>
                <h3 className="text-base font-black text-slate-900">{activeItem.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-emerald-600">
                  {activeItem.price * itemQty} ฿
                </span>
                <button
                  onClick={() => setActiveItem(null)}
                  className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              {/* Quantity */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-bold text-slate-700">จำนวนที่ต้องการ:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setItemQty(Math.max(1, itemQty - 1))}
                    className="w-9 h-9 rounded-xl bg-white border border-slate-300 flex items-center justify-center text-slate-700 font-bold active:scale-95 cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center font-black text-lg text-slate-900">{itemQty}</span>
                  <button
                    type="button"
                    onClick={() => setItemQty(itemQty + 1)}
                    className="w-9 h-9 rounded-xl bg-white border border-slate-300 flex items-center justify-center text-slate-700 font-bold active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  หมายเหตุเพิ่มเติม:
                </label>
                <input
                  type="text"
                  value={itemNote}
                  onChange={(e) => setItemNote(e.target.value)}
                  placeholder="เช่น ไม่ใส่กระเทียม, กรอบๆ"
                  className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="sticky bottom-0 bg-white/95 backdrop-blur-xs p-3.5 border-t border-slate-200 flex gap-2 shadow-lg z-10">
              <button
                type="button"
                onClick={() => setActiveItem(null)}
                className="py-3 px-4 rounded-xl border border-slate-300 bg-white text-slate-700 font-bold text-sm hover:bg-slate-100 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmAddItem}
                className="flex-1 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-black text-base shadow-md shadow-red-200 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                <span>เพิ่มลงตะกร้า ({activeItem.price * itemQty} ฿)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Drawer / Sheet */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4 animate-fade-in">
          <div className="fixed inset-0" onClick={() => setIsCheckoutOpen(false)} />
          <div className="relative z-10 bg-white w-full rounded-t-3xl sm:rounded-3xl sm:max-w-md shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-red-600 uppercase tracking-wider">
                  {diningType === 'dine_in' ? `สั่งอาหารที่ ${tableNumber}` : 'ยืนยันออเดอร์กลับบ้าน'}
                </span>
                <h3 className="text-base font-black text-slate-900">
                  รายการอาหาร ({totalCartCount} ชิ้น)
                </h3>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Previous orders hint in checkout drawer */}
            {tableOrders.length > 0 && (
              <div className="px-4 py-2 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between text-xs">
                <span className="text-indigo-900 font-bold">
                  โต๊ะนี้สั่งไปแล้ว {tableOrders.length} บิล ({totalTableOrderedAmount} ฿)
                </span>
                <button
                  type="button"
                  onClick={() => setIsOrderHistoryOpen(true)}
                  className="text-[11px] font-black text-indigo-700 hover:text-indigo-900 underline flex items-center gap-1 cursor-pointer"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>ดูรายการเดิม</span>
                </button>
              </div>
            )}

            {/* Scrollable Form Body */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1 text-slate-800">
              {/* Cart Items List */}
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {customerCart.map(item => (
                  <div key={item.cartItemId} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex-1 pr-2 truncate">
                      <div className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap">
                        {item.spicyLevel && item.spicyLevel !== 'none' && (
                          <span className="text-red-600 font-semibold">
                            [{spicyOptions.find(s => s.id === item.spicyLevel)?.label.split(' ')[0] || item.spicyLevel}]
                          </span>
                        )}
                        {item.note && <span className="text-slate-400">({item.note})</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-black text-xs text-slate-900">
                        {item.price * item.quantity} ฿
                      </span>
                      <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg p-0.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.cartItemId, -1)}
                          className="w-6 h-6 flex items-center justify-center text-slate-600 font-bold hover:bg-slate-100 rounded"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-5 text-center font-bold text-xs">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.cartItemId, 1)}
                          className="w-6 h-6 flex items-center justify-center text-slate-600 font-bold hover:bg-slate-100 rounded"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Summary */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                <span className="font-bold text-xs text-slate-700">ยอดรวมทั้งสิ้น:</span>
                <span className="text-2xl font-black text-emerald-600">{totalCartPrice} ฿</span>
              </div>

              {/* DINE-IN TABLE DETAILS */}
              {diningType === 'dine_in' ? (
                <div className="space-y-3 bg-indigo-50/70 p-3.5 rounded-2xl border border-indigo-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                      <UtensilsCrossed className="w-4 h-4 text-indigo-600" />
                      <span>หมายเลขโต๊ะของคุณ:</span>
                    </label>
                    <span className="text-xs font-black text-indigo-700 bg-white px-2.5 py-0.5 rounded-lg border border-indigo-200">
                      {tableNumber}
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-indigo-900 mb-1">
                      ชื่อผู้สั่ง (ระบุหรือไม่ก็ได้):
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder={`เช่น คุณลูกค้า (${tableNumber})`}
                      className="w-full h-10 px-3 text-xs bg-white border border-indigo-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>

                  {/* Payment Choices for Dine-In */}
                  <div>
                    <label className="block text-[11px] font-bold text-indigo-950 mb-1.5">
                      การชำระเงิน:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('cash')}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          paymentMethod === 'cash'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-white border-indigo-200 text-indigo-950'
                        }`}
                      >
                        <div className="font-extrabold text-xs">เช็กบิลหน้าร้าน</div>
                        <div className={`text-[10px] mt-0.5 ${paymentMethod === 'cash' ? 'text-indigo-100' : 'text-slate-500'}`}>
                          ทานเสร็จค่อยจ่าย
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('promptpay')}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          paymentMethod === 'promptpay'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-white border-indigo-200 text-indigo-950'
                        }`}
                      >
                        <div className="font-extrabold text-xs">พร้อมเพย์ QR</div>
                        <div className={`text-[10px] mt-0.5 ${paymentMethod === 'promptpay' ? 'text-blue-100' : 'text-slate-500'}`}>
                          สแกนจ่ายทันที
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* TAKEAWAY DETAILS */
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-500" />
                        <span>ชื่อผู้สั่ง *</span>
                      </label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="เช่น คุณกานต์"
                        className="w-full h-11 px-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500 font-medium"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        <span>เบอร์โทรศัพท์ *</span>
                      </label>
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="เช่น 0891234567"
                        className="w-full h-11 px-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500 font-medium"
                        required
                      />
                    </div>
                  </div>

                  {/* Pickup Time Option */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>เวลานัดมารับอาหาร:</span>
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setPickupOption('asap')}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          pickupOption === 'asap'
                            ? 'bg-red-600 text-white border-red-600 shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        ⚡ เร็วที่สุด (~{lineSettings.pickupIntervalMinutes || 15} นาที)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPickupOption('30m')}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          pickupOption === '30m'
                            ? 'bg-red-600 text-white border-red-600 shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        🕒 อีก 30 นาที
                      </button>
                      <button
                        type="button"
                        onClick={() => setPickupOption('45m')}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          pickupOption === '45m'
                            ? 'bg-red-600 text-white border-red-600 shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        🕒 อีก 45 นาที
                      </button>
                      <button
                        type="button"
                        onClick={() => setPickupOption('custom')}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          pickupOption === 'custom'
                            ? 'bg-red-600 text-white border-red-600 shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        ⏰ ระบุเวลาเอง...
                      </button>
                    </div>

                    {pickupOption === 'custom' && (
                      <div className="mt-2">
                        <input
                          type="time"
                          value={customPickupTime}
                          onChange={(e) => setCustomPickupTime(e.target.value)}
                          className="w-full h-10 px-3 text-sm bg-slate-50 border border-slate-300 rounded-xl"
                        />
                      </div>
                    )}
                  </div>

                  {/* Payment Method Option */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      เลือกวิธีชำระเงิน:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('promptpay')}
                        className={`p-3 rounded-2xl border text-left flex items-center gap-2 transition-all ${
                          paymentMethod === 'promptpay'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <QrCode className="w-5 h-5 flex-shrink-0" />
                        <div>
                          <div className="font-extrabold text-xs">พร้อมเพย์ QR</div>
                          <div className={`text-[10px] ${paymentMethod === 'promptpay' ? 'text-blue-100' : 'text-slate-400'}`}>
                            สแกนจ่ายล่วงหน้า
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('cash')}
                        className={`p-3 rounded-2xl border text-left flex items-center gap-2 transition-all ${
                          paymentMethod === 'cash'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <Banknote className="w-5 h-5 flex-shrink-0" />
                        <div>
                          <div className="font-extrabold text-xs">เงินสดหน้าร้าน</div>
                          <div className={`text-[10px] ${paymentMethod === 'cash' ? 'text-emerald-100' : 'text-slate-400'}`}>
                            จ่ายตอนมารับของ
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ระดับความเผ็ด / รสชาติของบิลนี้ (ตอนคิดตัง) */}
              <div className="bg-red-50/70 p-3.5 rounded-2xl border border-red-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-red-950 flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-red-600" />
                    <span>เลือกระดับความเผ็ด / รสชาติของบิลนี้:</span>
                  </label>
                  <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-md">
                    *เลือก 1 อย่าง
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {activeSpicyOptions.map(spicy => {
                    const isSelected = checkoutSpicy === spicy.id
                    return (
                      <button
                        key={spicy.id}
                        type="button"
                        onClick={() => setCheckoutSpicy(spicy.id)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-red-600 text-white border-red-600 shadow-md ring-2 ring-red-300'
                            : 'bg-white border-red-200 hover:bg-red-50 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-black text-xs sm:text-sm">{spicy.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                        {spicy.desc && (
                          <span className={`text-[10px] mt-1 line-clamp-1 ${isSelected ? 'text-red-100' : 'text-slate-400'}`}>
                            {spicy.desc}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Extra Bill Options (ตอนกำลังจะคิดตังค์) */}
              <div className="bg-amber-50/80 p-3.5 rounded-2xl border border-amber-200/90 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>ตัวเลือกพิเศษของบิลนี้:</span>
                  </label>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-md">
                    เลือกได้หลายอย่าง (ฟรี)
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => toggleCustomerOrderAddon('โรยงาขาวคั่วเยอะๆ')}
                    className={`p-2.5 rounded-xl border text-left transition-all text-xs font-black flex items-center justify-between cursor-pointer ${
                      customerOrderAddons.includes('โรยงาขาวคั่วเยอะๆ')
                        ? 'bg-amber-500 text-white border-amber-500 shadow-xs ring-2 ring-amber-300'
                        : 'bg-white border-amber-200 text-amber-950 hover:bg-amber-100/50'
                    }`}
                  >
                    <div className="truncate">🌾 โรยงาขาวคั่วเยอะๆ</div>
                    {customerOrderAddons.includes('โรยงาขาวคั่วเยอะๆ') && (
                      <Check className="w-4 h-4 text-white flex-shrink-0" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleCustomerOrderAddon('ทอดกรอบแห้งพิเศษ')}
                    className={`p-2.5 rounded-xl border text-left transition-all text-xs font-black flex items-center justify-between cursor-pointer ${
                      customerOrderAddons.includes('ทอดกรอบแห้งพิเศษ')
                        ? 'bg-amber-500 text-white border-amber-500 shadow-xs ring-2 ring-amber-300'
                        : 'bg-white border-amber-200 text-amber-950 hover:bg-amber-100/50'
                    }`}
                  >
                    <div className="truncate">🍟 ทอดกรอบแห้งพิเศษ</div>
                    {customerOrderAddons.includes('ทอดกรอบแห้งพิเศษ') && (
                      <Check className="w-4 h-4 text-white flex-shrink-0" />
                    )}
                  </button>
                </div>
              </div>

              {/* Order Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  หมายเหตุเพิ่มเติมถึงทางร้าน / ครัว:
                </label>
                <input
                  type="text"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="เช่น ไม่ใส่กระเทียม, ขอถ้วยจานเพิ่ม"
                  className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            {/* Sticky Submit Footer */}
            <div className="sticky bottom-0 bg-white/95 backdrop-blur-xs p-3.5 border-t border-slate-200 flex gap-2 shadow-lg z-10">
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="py-3 px-4 rounded-xl border border-slate-300 bg-white text-slate-700 font-bold text-sm hover:bg-slate-100 cursor-pointer"
              >
                แก้ไข
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleCustomerSubmitOrder}
                className="flex-1 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-black text-base shadow-md shadow-red-200 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-5 h-5" />
                <span>
                  {isSubmitting 
                    ? 'กำลังส่งออเดอร์...' 
                    : diningType === 'dine_in'
                      ? `ส่งออเดอร์เข้าครัว (${tableNumber} • ${totalCartPrice} ฿)`
                      : `ยืนยันสั่งกลับบ้าน (${totalCartPrice} ฿)`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Order History Drawer / Modal --- */}
      {isOrderHistoryOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4 animate-fade-in">
          <div className="fixed inset-0" onClick={() => setIsOrderHistoryOpen(false)} />
          <div className="relative z-10 bg-white w-full rounded-t-3xl sm:rounded-3xl sm:max-w-lg shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                    <span>ประวัติอาหารที่สั่ง</span>
                    <span className="text-xs font-black px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                      {cleanTableNumber}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    รวม {tableOrders.length} รอบการสั่ง · อาหารทั้งหมด {totalItemsOrdered} รายการ
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOrderHistoryOpen(false)}
                className="w-9 h-9 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Total Summary Banner */}
            <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-200/70 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-800 block">
                  ยอดรวมอาหารทั้งหมดของโต๊ะนี้:
                </span>
                <div className="text-2xl sm:text-3xl font-black text-emerald-600">
                  {totalTableOrderedAmount} <span className="text-sm font-bold text-emerald-700">฿</span>
                </div>
              </div>
              <div className="text-right text-[11px] text-emerald-800">
                {totalTableOrderedAmount > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowHistoryQr(prev => !prev)}
                    className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>{showHistoryQr ? 'ซ่อน QR ชำระเงิน' : 'สแกน QR จ่ายเงิน'}</span>
                  </button>
                )}
                <span className="block text-[10px] text-slate-400 mt-1">
                  (อัปเดตสถานะแบบ Real-time)
                </span>
              </div>
            </div>

            {/* PromptPay QR Toggle Inside History */}
            {showHistoryQr && totalTableOrderedAmount > 0 && (
              <div className="p-4 bg-blue-50/80 border-b border-blue-200 text-center space-y-2.5 animate-fade-in">
                <span className="text-xs font-bold text-blue-900 block">
                  สแกนชำระเงินผ่านพร้อมเพย์ ({totalTableOrderedAmount} ฿)
                </span>
                <div className="inline-block bg-white p-2.5 rounded-2xl border border-blue-200 shadow-sm">
                  {tableBilledQrUrl ? (
                    <img src={tableBilledQrUrl} alt="PromptPay QR" className="w-44 h-44 mx-auto object-contain" />
                  ) : (
                    <div className="w-44 h-44 flex items-center justify-center text-xs text-slate-400">
                      กำลังสร้าง QR...
                    </div>
                  )}
                </div>
                <div className="text-xs text-slate-600 flex items-center justify-center gap-1.5">
                  <span>พร้อมเพย์:</span>
                  <span className="font-bold text-slate-900">{shopSettings.promptpayPhone || '0812345678'}</span>
                  <span className="text-[10px] text-slate-400">({shopSettings.shopName || 'ร้านหม่าล่าทอด ตุ่นฟินเว่อร์'})</span>
                  <button
                    type="button"
                    onClick={() => {
                      const phone = shopSettings.promptpayPhone || '0812345678'
                      navigator.clipboard.writeText(phone)
                      setCopiedPromptPay(true)
                      setTimeout(() => setCopiedPromptPay(false), 2000)
                    }}
                    className="p-1 hover:bg-blue-100 rounded text-blue-600 cursor-pointer"
                    title="คัดลอกเบอร์"
                  >
                    {copiedPromptPay ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  สแกนได้จากทุกแอปธนาคาร ยอดเงิน {totalTableOrderedAmount} ฿ จะขึ้นให้อัตโนมัติทันที
                </p>
              </div>
            )}

            {/* Orders List */}
            <div className="p-4 overflow-y-auto space-y-3.5 flex-1 text-slate-800">
              {tableOrders.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <ChefHat className="w-12 h-12 stroke-1 text-slate-300 mx-auto" />
                  <p className="font-bold text-sm text-slate-600">ยังไม่มีรายการสั่งอาหารในรอบนี้</p>
                  <p className="text-xs text-slate-400">เลือกเมนูหม่าล่าทอดแล้วกดสั่งได้เลย ออเดอร์จะขึ้นที่นี่ทันที</p>
                </div>
              ) : (
                tableOrders.map((ord, idx) => {
                  const spObj = spicyOptions.find(s => s.id === ord.spicyLevel) || SPICY_LEVELS.find(s => s.id === ord.spicyLevel)
                  const spLabel = spObj?.label || ord.spicyLevel

                  let statusBadge = 'bg-amber-100 text-amber-800 border-amber-300'
                  let statusText = '⏳ รอคิวปรุง'
                  if (ord.status === 'cooking') {
                    statusBadge = 'bg-blue-600 text-white border-blue-600 animate-pulse shadow-2xs'
                    statusText = '🍳 กำลังทอด...'
                  } else if (ord.status === 'ready') {
                    statusBadge = 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                    statusText = '🛎️ ทอดเสร็จแล้ว พร้อมเสิร์ฟ'
                  } else if (ord.status === 'completed') {
                    statusBadge = 'bg-slate-100 text-slate-700 border-slate-300'
                    statusText = '✅ เสิร์ฟแล้ว'
                  }

                  return (
                    <div
                      key={ord.id}
                      className="p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200 space-y-2 text-xs shadow-2xs"
                    >
                      {/* Order Header */}
                      <div className="flex items-center justify-between font-bold text-slate-800 pb-1.5 border-b border-slate-200">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-red-600 text-white font-black text-xs shadow-2xs">
                            {ord.orderNumber}
                          </span>
                          <span className="font-bold text-slate-700 text-xs">
                            รอบที่ {tableOrders.length - idx}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium">
                            · {new Date(ord.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                          </span>
                        </div>

                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${statusBadge}`}>
                          {statusText}
                        </span>
                      </div>

                      {/* Spicy Level */}
                      {ord.spicyLevel && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-red-50 to-orange-50 text-red-950 border border-red-200 font-bold">
                          <Flame className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                          <span className="text-[11px] text-red-800">ระดับความเผ็ด:</span>
                          <span className="px-2 py-0.5 rounded-md bg-red-600 text-white font-black text-[11px] shadow-2xs">
                            {spLabel}
                          </span>
                        </div>
                      )}

                      {/* Addons */}
                      {ord.orderAddons && ord.orderAddons.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 text-amber-950 border border-amber-200 font-bold">
                          <span className="text-[11px] font-black text-amber-800 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-600" />
                            <span>ตัวเลือกพิเศษ:</span>
                          </span>
                          {ord.orderAddons.map((addon, aIdx) => (
                            <span key={aIdx} className="text-[11px] font-bold bg-white px-2 py-0.5 rounded-md border border-amber-300 text-amber-900 shadow-2xs">
                              {addon.includes('งา') ? `🌾 ${addon}` : addon.includes('กรอบ') ? `🍟 ${addon}` : addon}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Notes */}
                      {ord.notes && (
                        <div className="px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-[11px] border border-slate-200">
                          <span className="font-bold text-slate-800">📝 โน้ต:</span> {ord.notes}
                        </div>
                      )}

                      {/* Item list */}
                      <div className="divide-y divide-slate-200/60 pt-0.5">
                        {ord.items.map((item, itemIdx) => (
                          <div key={itemIdx} className="py-1 flex justify-between items-center text-slate-700">
                            <div className="flex-1 pr-2 truncate">
                              <span className="font-medium text-slate-900">{item.name}</span>
                              <span className="font-bold text-slate-900 ml-1">×{item.quantity}</span>
                              {item.note && (
                                <span className="block text-[10px] text-slate-400">({item.note})</span>
                              )}
                            </div>
                            <span className="font-bold text-slate-900 flex-shrink-0">
                              {item.price * item.quantity} ฿
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Subtotal of this round */}
                      <div className="pt-1.5 border-t border-slate-200 flex justify-between items-center font-black">
                        <span className="text-slate-500 text-xs">ยอดรอบนี้:</span>
                        <span className="text-emerald-600 text-sm">{ord.grandTotal} ฿</span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setIsOrderHistoryOpen(false)}
                className="py-2.5 px-4 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs cursor-pointer transition-colors"
              >
                ปิดหน้าต่าง
              </button>

              {!isTableBilled && (
                <button
                  type="button"
                  onClick={() => setIsOrderHistoryOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-red-200 cursor-pointer transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>สั่งอาหารเพิ่ม</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
