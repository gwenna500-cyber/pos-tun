import { create } from 'zustand'
import confetti from 'canvas-confetti'
import type { 
  CartItem, 
  MenuItem, 
  Order, 
  ShopSettings, 
  SpicyLevel, 
  SpicyOption,
  MenuCategory,
  CookingMethod, 
  DiningType, 
  PaymentMethod, 
  StickColorId,
  TableSession
} from '../types'
import { 
  STICK_COLORS, 
  DEFAULT_SHOP_SETTINGS, 
  DEFAULT_MENU_ITEMS, 
  DEFAULT_SPICY_OPTIONS, 
  DEFAULT_MENU_CATEGORIES 
} from '../lib/constants'
import { 
  db, 
  saveOrderToDb, 
  getNextQueueNumber, 
  getPendingSyncOrders,
  getAllMenuItemsFromDb,
  saveMenuItemToDb,
  deleteMenuItemFromDb,
  resetMenuToDefaultsInDb,
  getSpicyOptionsFromDb,
  saveSpicyOptionsToDb,
  resetSpicyToDefaultsInDb,
  getTableSessionsFromDb,
  saveTableSessionsToDb,
  updateOrderStatusInDb
} from '../lib/db'
import { 
  pushOrderToFirebase, 
  isFirebaseReady,
  syncMenuItemsToFirebase,
  syncSpicyOptionsToFirebase,
  updateFirebaseTableSession,
  subscribeToFirebaseTableSessions,
  updateFirebaseOrderStatus
} from '../lib/firebase'
import { triggerHaptic, playTapSound, playSuccessChime } from '../lib/soundAndHaptic'
import { bluetoothPrinter } from '../lib/bluetoothPrinter'
import { sendLineOrderWebhook } from '../lib/lineNotify'

export type PosView = 'pos' | 'kitchen' | 'sales' | 'menu' | 'settings' | 'online-order'

interface PosState {
  // Navigation & UI
  currentView: PosView
  setCurrentView: (view: PosView) => void
  isMobileCartOpen: boolean
  toggleMobileCart: (open?: boolean) => void

  // Cart & Order Modifiers
  cart: CartItem[]
  spicyLevel: SpicyLevel
  cookingMethod: CookingMethod
  diningType: DiningType
  customerQueue: string
  orderNotes: string
  discount: number
  orderAddons: string[]

  // Actions for Cart
  addStickByColor: (colorId: StickColorId) => void
  addMenuItem: (item: MenuItem, spicyLevel?: SpicyLevel, note?: string, quantity?: number, addons?: string[]) => void
  updateCartItemSpicy: (cartItemId: string, spicyLevel: SpicyLevel) => void
  incrementCartItem: (cartItemId: string) => void
  decrementCartItem: (cartItemId: string) => void
  removeCartItem: (cartItemId: string) => void
  clearCart: () => void

  // Modifiers setters
  setSpicyLevel: (level: SpicyLevel) => void
  setCookingMethod: (method: CookingMethod) => void
  setDiningType: (type: DiningType) => void
  setCustomerQueue: (queue: string) => void
  setOrderNotes: (notes: string) => void
  setDiscount: (amount: number) => void
  setOrderAddons: (addons: string[]) => void
  toggleOrderAddon: (addon: string) => void

  // Menu items list & Spicy options
  menuItems: MenuItem[]
  spicyOptions: SpicyOption[]
  categories: MenuCategory[]
  loadMenuAndSpicy: () => Promise<void>
  addMenuItemRecord: (item: Omit<MenuItem, 'id'>) => Promise<MenuItem>
  updateMenuItemRecord: (id: string, updates: Partial<MenuItem>) => Promise<void>
  deleteMenuItemRecord: (id: string) => Promise<void>
  toggleMenuItemAvailability: (id: string) => Promise<void>
  addSpicyOptionRecord: (option: Omit<SpicyOption, 'id'>) => Promise<SpicyOption>
  updateSpicyOptionRecord: (id: string, updates: Partial<SpicyOption>) => Promise<void>
  deleteSpicyOptionRecord: (id: string) => Promise<void>
  toggleSpicyOptionAvailability: (id: string) => Promise<void>
  resetMenuDefaults: () => Promise<void>
  resetSpicyDefaults: () => Promise<void>

  // Checkout & Modals
  isPaymentModalOpen: boolean
  activeCheckoutOrder: Order | null
  openPaymentModal: () => void
  closePaymentModal: () => void

  isReceiptModalOpen: boolean
  activeReceiptOrder: Order | null
  openReceiptModal: (order: Order) => void
  closeReceiptModal: () => void

  // Settings & Network
  shopSettings: ShopSettings
  setShopSettings: (settings: Partial<ShopSettings>) => void
  isOnline: boolean
  setIsOnline: (online: boolean) => void
  pendingSyncCount: number
  refreshSyncCount: () => Promise<void>

  // Table Management & Table Sessions
  tableSessions: Record<string, TableSession>
  isTableStatusModalOpen: boolean
  openTableStatusModal: () => void
  closeTableStatusModal: () => void
  billTableSession: (tableNumber: string, paymentMethod?: PaymentMethod) => Promise<void>
  clearTableSession: (tableNumber: string) => Promise<void>
  openTableSession: (tableNumber: string) => Promise<string>
  loadTableSessions: () => Promise<void>

  // Checkout process
  finalizeCheckout: (paymentMethod: PaymentMethod, cashReceived?: number) => Promise<Order | null>
  submitCustomerOrder: (orderData: {
    diningType: DiningType
    tableNumber?: string
    customerName?: string
    customerPhone?: string
    pickupTime?: string
    notes?: string
    orderAddons?: string[]
    spicyLevel?: SpicyLevel
    items: CartItem[]
    paymentMethod: PaymentMethod
    paymentStatus?: 'paid' | 'pending'
  }) => Promise<Order>
  submitOnlineTakeawayOrder: (orderData: {
    customerName: string
    customerPhone: string
    pickupTime: string
    notes?: string
    orderAddons?: string[]
    items: CartItem[]
    paymentMethod: PaymentMethod
  }) => Promise<Order>
}

const isOnlineOrderInitial = typeof window !== 'undefined' && 
  (window.location.search.includes('order') || 
   window.location.hash.includes('order') ||
   window.location.search.includes('table') || 
   window.location.hash.includes('table'))

export const usePosStore = create<PosState>((set, get) => ({
  currentView: isOnlineOrderInitial ? 'online-order' : 'pos',
  setCurrentView: (view) => set({ currentView: view }),
  isMobileCartOpen: false,
  toggleMobileCart: (open) => set((state) => ({ 
    isMobileCartOpen: open !== undefined ? open : !state.isMobileCartOpen 
  })),

  cart: [],
  spicyLevel: 'medium',
  cookingMethod: 'grill',
  diningType: 'takeaway',
  customerQueue: '',
  orderNotes: '',
  discount: 0,
  orderAddons: [],

  menuItems: DEFAULT_MENU_ITEMS,
  spicyOptions: DEFAULT_SPICY_OPTIONS,
  categories: DEFAULT_MENU_CATEGORIES,

  loadMenuAndSpicy: async () => {
    try {
      const items = await getAllMenuItemsFromDb()
      const spicy = await getSpicyOptionsFromDb()
      const settingsRecord = await db.settings.get('shopSettings')
      if (settingsRecord && settingsRecord.value) {
        set({ 
          menuItems: items, 
          spicyOptions: spicy,
          shopSettings: {
            ...DEFAULT_SHOP_SETTINGS,
            ...settingsRecord.value,
            lineOaSettings: {
              ...DEFAULT_SHOP_SETTINGS.lineOaSettings,
              ...(settingsRecord.value.lineOaSettings || {})
            }
          }
        })
      } else {
        set({ menuItems: items, spicyOptions: spicy })
      }
      get().loadTableSessions()
    } catch (err) {
      console.error('Failed to load menu & spicy:', err)
    }
  },

  addMenuItemRecord: async (itemData) => {
    const newItem: MenuItem = {
      ...itemData,
      id: `m_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    }
    await saveMenuItemToDb(newItem)
    const updated = [...get().menuItems, newItem]
    set({ menuItems: updated })
    syncMenuItemsToFirebase(updated).catch(console.error)
    return newItem
  },

  updateMenuItemRecord: async (id, updates) => {
    const current = get().menuItems
    const updated = current.map(item => item.id === id ? { ...item, ...updates } : item)
    set({ menuItems: updated })
    const item = updated.find(i => i.id === id)
    if (item) {
      await saveMenuItemToDb(item)
    }
    syncMenuItemsToFirebase(updated).catch(console.error)
  },

  deleteMenuItemRecord: async (id) => {
    await deleteMenuItemFromDb(id)
    const updated = get().menuItems.filter(item => item.id !== id)
    set({ menuItems: updated })
    syncMenuItemsToFirebase(updated).catch(console.error)
  },

  toggleMenuItemAvailability: async (id) => {
    const current = get().menuItems
    const updated = current.map(item =>
      item.id === id ? { ...item, isAvailable: !item.isAvailable } : item
    )
    set({ menuItems: updated })
    const target = updated.find(i => i.id === id)
    if (target) {
      await saveMenuItemToDb(target)
    }
    syncMenuItemsToFirebase(updated).catch(console.error)
  },

  addSpicyOptionRecord: async (optionData) => {
    const newOption: SpicyOption = {
      ...optionData,
      id: `spicy_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    }
    const updated = [...get().spicyOptions, newOption]
    set({ spicyOptions: updated })
    await saveSpicyOptionsToDb(updated)
    syncSpicyOptionsToFirebase(updated).catch(console.error)
    return newOption
  },

  updateSpicyOptionRecord: async (id, updates) => {
    const current = get().spicyOptions
    const updated = current.map(s => s.id === id ? { ...s, ...updates } : s)
    set({ spicyOptions: updated })
    await saveSpicyOptionsToDb(updated)
    syncSpicyOptionsToFirebase(updated).catch(console.error)
  },

  deleteSpicyOptionRecord: async (id) => {
    const updated = get().spicyOptions.filter(s => s.id !== id)
    set({ spicyOptions: updated })
    await saveSpicyOptionsToDb(updated)
    syncSpicyOptionsToFirebase(updated).catch(console.error)
  },

  toggleSpicyOptionAvailability: async (id) => {
    const current = get().spicyOptions
    const updated = current.map(s =>
      s.id === id ? { ...s, isAvailable: !s.isAvailable } : s
    )
    set({ spicyOptions: updated })
    await saveSpicyOptionsToDb(updated)
    syncSpicyOptionsToFirebase(updated).catch(console.error)
  },

  resetMenuDefaults: async () => {
    const items = await resetMenuToDefaultsInDb()
    set({ menuItems: items })
    syncMenuItemsToFirebase(items).catch(console.error)
  },

  resetSpicyDefaults: async () => {
    const spicy = await resetSpicyToDefaultsInDb()
    set({ spicyOptions: spicy })
    syncSpicyOptionsToFirebase(spicy).catch(console.error)
  },

  addStickByColor: (colorId) => {
    const stick = (STICK_COLORS as any[]).find(s => s.id === colorId)
    if (!stick) return

    const { shopSettings } = get()
    if (shopSettings.hapticEnabled) triggerHaptic(50)
    if (shopSettings.soundEnabled) playTapSound()

    set((state) => {
      const existingIndex = state.cart.findIndex(
        item => item.stickColorId === colorId && !item.menuItemId
      )

      if (existingIndex > -1) {
        const newCart = [...state.cart]
        newCart[existingIndex] = {
          ...newCart[existingIndex],
          quantity: newCart[existingIndex].quantity + 1
        }
        return { cart: newCart }
      } else {
        const newItem: CartItem = {
          cartItemId: `stick-${colorId}-${Date.now()}`,
          name: stick.name,
          price: stick.price,
          quantity: 1,
          stickColorId: colorId,
          category: 'quick'
        }
        return { cart: [...state.cart, newItem] }
      }
    })
  },

  addMenuItem: (item, spicyLevel = 'medium', note = '', quantity = 1, addons = []) => {
    const { shopSettings } = get()
    if (shopSettings.hapticEnabled) triggerHaptic(50)
    if (shopSettings.soundEnabled) playTapSound()

    const sortedAddons = [...addons].sort()
    const addonsKey = JSON.stringify(sortedAddons)

    set((state) => {
      // Find item with same ID, same spicy level, same addons, and same note
      const existingIndex = state.cart.findIndex(
        cItem => 
          cItem.menuItemId === item.id && 
          cItem.spicyLevel === spicyLevel &&
          JSON.stringify([...(cItem.addons || [])].sort()) === addonsKey &&
          (cItem.note || '') === (note || '')
      )

      if (existingIndex > -1) {
        const newCart = [...state.cart]
        newCart[existingIndex] = {
          ...newCart[existingIndex],
          quantity: newCart[existingIndex].quantity + quantity
        }
        return { cart: newCart }
      } else {
        const newItem: CartItem = {
          cartItemId: `menu-${item.id}-${spicyLevel}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          menuItemId: item.id,
          name: item.name,
          price: item.price,
          quantity: quantity,
          spicyLevel: spicyLevel,
          category: item.category,
          note: note,
          addons: sortedAddons
        }
        return { cart: [...state.cart, newItem] }
      }
    })
  },

  updateCartItemSpicy: (cartItemId, spicyLevel) => {
    const { shopSettings } = get()
    if (shopSettings.hapticEnabled) triggerHaptic(30)
    set((state) => ({
      cart: state.cart.map(item =>
        item.cartItemId === cartItemId ? { ...item, spicyLevel } : item
      )
    }))
  },

  incrementCartItem: (cartItemId) => {
    const { shopSettings } = get()
    if (shopSettings.hapticEnabled) triggerHaptic(30)
    if (shopSettings.soundEnabled) playTapSound()

    set((state) => ({
      cart: state.cart.map(item => 
        item.cartItemId === cartItemId 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    }))
  },

  decrementCartItem: (cartItemId) => {
    const { shopSettings } = get()
    if (shopSettings.hapticEnabled) triggerHaptic(30)
    if (shopSettings.soundEnabled) playTapSound()

    set((state) => {
      const item = state.cart.find(i => i.cartItemId === cartItemId)
      if (!item) return state

      if (item.quantity <= 1) {
        return { cart: state.cart.filter(i => i.cartItemId !== cartItemId) }
      } else {
        return {
          cart: state.cart.map(i => 
            i.cartItemId === cartItemId ? { ...i, quantity: i.quantity - 1 } : i
          )
        }
      }
    })
  },

  removeCartItem: (cartItemId) => {
    const { shopSettings } = get()
    if (shopSettings.hapticEnabled) triggerHaptic(40)
    set((state) => ({
      cart: state.cart.filter(item => item.cartItemId !== cartItemId)
    }))
  },

  clearCart: () => {
    set({
      cart: [],
      customerQueue: '',
      orderNotes: '',
      discount: 0
    })
  },

  setSpicyLevel: (spicyLevel) => {
    const { shopSettings } = get()
    if (shopSettings.hapticEnabled) triggerHaptic(30)
    set({ spicyLevel })
  },

  setCookingMethod: (cookingMethod) => {
    const { shopSettings } = get()
    if (shopSettings.hapticEnabled) triggerHaptic(30)
    set({ cookingMethod })
  },

  setDiningType: (diningType) => {
    const { shopSettings } = get()
    if (shopSettings.hapticEnabled) triggerHaptic(30)
    set({ diningType })
  },

  setCustomerQueue: (customerQueue) => set({ customerQueue }),
  setOrderNotes: (orderNotes) => set({ orderNotes }),
  setDiscount: (discount) => set({ discount }),
  setOrderAddons: (orderAddons) => set({ orderAddons }),
  toggleOrderAddon: (addon) => set((state) => {
    const exists = state.orderAddons.includes(addon)
    const updated = exists
      ? state.orderAddons.filter(a => a !== addon)
      : [...state.orderAddons, addon]
    return { orderAddons: updated }
  }),

  // Table status modal & table sessions
  tableSessions: {},
  isTableStatusModalOpen: false,
  openTableStatusModal: () => set({ isTableStatusModalOpen: true }),
  closeTableStatusModal: () => set({ isTableStatusModalOpen: false }),

  billTableSession: async (tableNumber: string, paymentMethod: PaymentMethod = 'cash') => {
    const { tableSessions, shopSettings } = get()
    const cleanTable = tableNumber.startsWith('โต๊ะ') ? tableNumber : `โต๊ะ ${tableNumber}`
    const existing = tableSessions[cleanTable]

    // 1. Mark all pending/cooking/ready orders of this table as completed & paid
    try {
      const allOrders = await db.orders.toArray()
      const tableOrders = allOrders.filter(
        o => (o.tableNumber === cleanTable || o.tableOrQueue === cleanTable) && 
             o.status !== 'completed' && 
             o.status !== 'cancelled'
      )

      for (const order of tableOrders) {
        await updateOrderStatusInDb(order.id, 'completed')
        await db.orders.update(order.id, { 
          paymentStatus: 'paid', 
          paymentMethod,
          completedAt: Date.now() 
        })
        if (isFirebaseReady()) {
          updateFirebaseOrderStatus(order.id, 'completed').catch(console.error)
        }
      }
    } catch (err) {
      console.warn('Error marking table orders completed:', err)
    }

    // 2. Mark table session as billed
    const updatedSession: TableSession = {
      tableNumber: cleanTable,
      sessionId: existing?.sessionId || `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      status: 'billed',
      openedAt: existing?.openedAt || Date.now(),
      billedAt: Date.now(),
      totalAmount: existing?.totalAmount || 0,
      orderCount: existing?.orderCount || 0,
      customerName: existing?.customerName,
      paymentMethod
    }

    const newSessions = { ...get().tableSessions, [cleanTable]: updatedSession }
    set({ tableSessions: newSessions })

    await saveTableSessionsToDb(newSessions)
    if (isFirebaseReady()) {
      await updateFirebaseTableSession(updatedSession)
    }

    // Broadcast update across local browser tabs
    try {
      localStorage.setItem('pos_broadcast_table_sessions', JSON.stringify({ timestamp: Date.now(), sessions: newSessions }))
    } catch {}

    if (shopSettings.soundEnabled) playSuccessChime()
    if (shopSettings.hapticEnabled) triggerHaptic([50, 50, 100])
  },

  clearTableSession: async (tableNumber: string) => {
    const cleanTable = tableNumber.startsWith('โต๊ะ') ? tableNumber : `โต๊ะ ${tableNumber}`
    const newSessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

    const updatedSession: TableSession = {
      tableNumber: cleanTable,
      sessionId: newSessionId,
      status: 'available',
      openedAt: Date.now(),
      totalAmount: 0,
      orderCount: 0
    }

    const newSessions = { ...get().tableSessions, [cleanTable]: updatedSession }
    set({ tableSessions: newSessions })

    await saveTableSessionsToDb(newSessions)
    if (isFirebaseReady()) {
      await updateFirebaseTableSession(updatedSession)
    }

    try {
      localStorage.setItem('pos_broadcast_table_sessions', JSON.stringify({ timestamp: Date.now(), sessions: newSessions }))
    } catch {}
  },

  openTableSession: async (tableNumber: string) => {
    const cleanTable = tableNumber.startsWith('โต๊ะ') ? tableNumber : `โต๊ะ ${tableNumber}`
    const newSessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

    const updatedSession: TableSession = {
      tableNumber: cleanTable,
      sessionId: newSessionId,
      status: 'occupied',
      openedAt: Date.now(),
      totalAmount: 0,
      orderCount: 0
    }

    const newSessions = { ...get().tableSessions, [cleanTable]: updatedSession }
    set({ tableSessions: newSessions })

    await saveTableSessionsToDb(newSessions)
    if (isFirebaseReady()) {
      await updateFirebaseTableSession(updatedSession)
    }

    try {
      localStorage.setItem('pos_broadcast_table_sessions', JSON.stringify({ timestamp: Date.now(), sessions: newSessions }))
    } catch {}

    return newSessionId
  },

  loadTableSessions: async () => {
    try {
      const local = await getTableSessionsFromDb()
      if (local && Object.keys(local).length > 0) {
        set({ tableSessions: local })
      }
    } catch (err) {
      console.warn('Error loading local table sessions:', err)
    }

    if (isFirebaseReady()) {
      subscribeToFirebaseTableSessions((cloudSessions) => {
        if (cloudSessions && Object.keys(cloudSessions).length > 0) {
          set(state => ({ tableSessions: { ...state.tableSessions, ...cloudSessions } }))
          saveTableSessionsToDb(cloudSessions).catch(console.error)
        }
      })
    }
  },

  // Checkout modal
  isPaymentModalOpen: false,
  activeCheckoutOrder: null,
  openPaymentModal: () => {
    const { cart } = get()
    if (cart.length === 0) return
    set({ isPaymentModalOpen: true })
  },
  closePaymentModal: () => set({ isPaymentModalOpen: false }),

  // Receipt modal
  isReceiptModalOpen: false,
  activeReceiptOrder: null,
  openReceiptModal: (order) => set({ isReceiptModalOpen: true, activeReceiptOrder: order }),
  closeReceiptModal: () => set({ isReceiptModalOpen: false, activeReceiptOrder: null }),

  // Settings & Network
  shopSettings: DEFAULT_SHOP_SETTINGS,
  setShopSettings: (newSettings) => {
    set((state) => {
      const updated = { ...state.shopSettings, ...newSettings }
      db.settings.put({ key: 'shopSettings', value: updated }).catch(console.error)
      return { shopSettings: updated }
    })
  },

  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  setIsOnline: (isOnline) => set({ isOnline }),
  pendingSyncCount: 0,
  refreshSyncCount: async () => {
    try {
      const pending = await getPendingSyncOrders()
      set({ pendingSyncCount: pending.length })
    } catch {
      set({ pendingSyncCount: 0 })
    }
  },

  // Finalize Checkout
  finalizeCheckout: async (paymentMethod, cashReceived) => {
    const state = get()
    const { 
      cart, 
      spicyLevel, 
      cookingMethod, 
      diningType, 
      customerQueue, 
      orderNotes, 
      discount, 
      shopSettings,
      orderAddons
    } = state

    if (cart.length === 0) return null

    // Calculate totals
    const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0)
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const grandTotal = Math.max(0, subtotal - (discount || 0))

    // Calculate change if cash
    let changeDue = 0
    if (paymentMethod === 'cash' && cashReceived !== undefined) {
      changeDue = Math.max(0, cashReceived - grandTotal)
    }

    // Generate queue number
    const queueNumber = await getNextQueueNumber()
    const queueLabel = customerQueue.trim() ? customerQueue.trim() : queueNumber

    const newOrder: Order = {
      id: `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      orderNumber: queueNumber,
      tableOrQueue: queueLabel,
      items: [...cart],
      totalItemsCount,
      subtotal,
      discount: discount || 0,
      grandTotal,
      spicyLevel,
      cookingMethod,
      diningType,
      notes: orderNotes.trim(),
      orderAddons: orderAddons.length > 0 ? [...orderAddons] : undefined,
      paymentMethod,
      paymentStatus: 'paid',
      cashReceived,
      changeDue,
      status: 'pending', // Send to kitchen
      createdAt: Date.now(),
      updatedAt: Date.now(),
      syncStatus: isFirebaseReady() ? 'synced' : 'pending_sync'
    }

    try {
      // 1. Save locally to Dexie (Offline-First)
      await saveOrderToDb(newOrder)

      // 2. If Firebase is active and online, push to cloud
      if (isFirebaseReady() && navigator.onLine) {
        await pushOrderToFirebase(newOrder)
      }

      // 3. Play audio feedback & confetti
      if (shopSettings.soundEnabled) playSuccessChime()
      if (shopSettings.hapticEnabled) triggerHaptic(100)

      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 }
        })
      } catch {}

      // 4. Auto print if configured
      if (shopSettings.autoPrintReceipt) {
        bluetoothPrinter.printOrder(newOrder, shopSettings).catch(console.error)
      }

      // 5. Reset cart and show receipt
      set({
        cart: [],
        customerQueue: '',
        orderNotes: '',
        orderAddons: [],
        discount: 0,
        isPaymentModalOpen: false,
        isMobileCartOpen: false,
        isReceiptModalOpen: true,
        activeReceiptOrder: newOrder
      })

      // Refresh sync count
      state.refreshSyncCount()

      return newOrder
    } catch (err) {
      console.error('Error finalizing checkout:', err)
      return null
    }
  },

  submitCustomerOrder: async (orderData) => {
    const { shopSettings } = get()
    const orderNumber = await getNextQueueNumber()
    const subtotal = orderData.items.reduce((s, i) => s + i.price * i.quantity, 0)
    const grandTotal = subtotal
    const totalItemsCount = orderData.items.reduce((s, i) => s + i.quantity, 0)
    const isTable = orderData.diningType === 'dine_in'
    const tableLabel = orderData.tableNumber || 'โต๊ะ 1'

    // 1. Table Lockout Validation: If table was billed, refuse further orders!
    if (isTable) {
      const currentSession = get().tableSessions[tableLabel]
      if (currentSession && currentSession.status === 'billed') {
        throw new Error(`โต๊ะ ${tableLabel} เช็คบิลเรียบร้อยแล้ว ไม่สามารถส่งออเดอร์เพิ่มได้ กรุณาติดต่อพนักงานครับ`)
      }
    }

    // 2. Manage table session ID
    let tableSessionId: string | undefined = undefined
    if (isTable) {
      const currentSession = get().tableSessions[tableLabel]
      if (currentSession?.sessionId && currentSession.status === 'occupied') {
        tableSessionId = currentSession.sessionId
      } else {
        tableSessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
      }
    }

    const newOrder: Order = {
      id: `${isTable ? 'table' : 'online'}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      orderNumber,
      tableOrQueue: isTable ? tableLabel : `LINE: ${orderData.customerName || 'กลับบ้าน'}`,
      items: orderData.items,
      totalItemsCount,
      subtotal,
      discount: 0,
      grandTotal,
      diningType: orderData.diningType,
      notes: orderData.notes || '',
      spicyLevel: orderData.spicyLevel || 'medium',
      orderAddons: orderData.orderAddons && orderData.orderAddons.length > 0 ? orderData.orderAddons : undefined,
      paymentMethod: orderData.paymentMethod,
      paymentStatus: orderData.paymentStatus || 'pending',
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      syncStatus: 'pending_sync',
      isLineOrder: !isTable,
      isTableQrOrder: isTable,
      tableNumber: isTable ? tableLabel : undefined,
      tableSessionId,
      customerName: orderData.customerName,
      customerPhone: orderData.customerPhone,
      pickupTime: orderData.pickupTime
    }

    // 3. Save locally in IndexedDB
    await saveOrderToDb(newOrder)

    // 4. Update table session state (set to occupied, increment counts)
    if (isTable && tableSessionId) {
      const prev = get().tableSessions[tableLabel]
      const updatedSession: TableSession = {
        tableNumber: tableLabel,
        sessionId: tableSessionId,
        status: 'occupied',
        openedAt: prev?.status === 'occupied' ? prev.openedAt : Date.now(),
        orderCount: (prev?.status === 'occupied' ? (prev.orderCount || 0) : 0) + 1,
        totalAmount: (prev?.status === 'occupied' ? (prev.totalAmount || 0) : 0) + grandTotal,
        lastOrderAt: Date.now(),
        customerName: orderData.customerName || prev?.customerName,
        paymentMethod: orderData.paymentMethod || prev?.paymentMethod
      }
      const nextSessions = { ...get().tableSessions, [tableLabel]: updatedSession }
      set({ tableSessions: nextSessions })
      saveTableSessionsToDb(nextSessions).catch(console.error)
      if (isFirebaseReady()) {
        updateFirebaseTableSession(updatedSession).catch(console.error)
      }
      try {
        localStorage.setItem('pos_broadcast_table_sessions', JSON.stringify({ timestamp: Date.now(), sessions: nextSessions }))
      } catch {}
    }

    // 5. Real-time broadcast via Firebase so cashiers and kitchen get notified immediately
    if (isFirebaseReady()) {
      pushOrderToFirebase(newOrder).catch(console.error)
    }

    // 6. Trigger Webhook / LINE Notification if configured
    if (shopSettings.lineOaSettings?.autoNotifyOnOrder) {
      sendLineOrderWebhook(newOrder, shopSettings.lineOaSettings, shopSettings.shopName).catch(console.error)
    }

    // 7. Play audio and haptic feedback
    if (shopSettings.soundEnabled) playSuccessChime()
    if (shopSettings.hapticEnabled) triggerHaptic([50, 100, 150])

    get().refreshSyncCount()
    return newOrder
  },

  submitOnlineTakeawayOrder: async (orderData) => {
    return get().submitCustomerOrder({
      ...orderData,
      diningType: 'takeaway'
    })
  }
}))

// Instant cross-tab local synchronization for Table Sessions
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'pos_broadcast_table_sessions' && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue)
        if (parsed && parsed.sessions) {
          usePosStore.setState({ tableSessions: parsed.sessions })
        }
      } catch {}
    }
  })
}

