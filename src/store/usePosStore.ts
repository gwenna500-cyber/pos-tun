import { create } from 'zustand'
import confetti from 'canvas-confetti'
import type { 
  CartItem, 
  MenuItem, 
  Order, 
  ShopSettings, 
  SpicyLevel, 
  CookingMethod, 
  DiningType, 
  PaymentMethod, 
  StickColorId 
} from '../types'
import { STICK_COLORS, DEFAULT_SHOP_SETTINGS, DEFAULT_MENU_ITEMS } from '../lib/constants'
import { db, saveOrderToDb, getNextQueueNumber, getPendingSyncOrders } from '../lib/db'
import { pushOrderToFirebase, isFirebaseReady } from '../lib/firebase'
import { triggerHaptic, playTapSound, playSuccessChime } from '../lib/soundAndHaptic'
import { bluetoothPrinter } from '../lib/bluetoothPrinter'

export type PosView = 'pos' | 'kitchen' | 'sales' | 'settings'

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

  // Actions for Cart
  addStickByColor: (colorId: StickColorId) => void
  addMenuItem: (item: MenuItem) => void
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

  // Menu items list
  menuItems: MenuItem[]
  setMenuItems: (items: MenuItem[]) => void

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

  // Checkout process
  finalizeCheckout: (paymentMethod: PaymentMethod, cashReceived?: number) => Promise<Order | null>
}

export const usePosStore = create<PosState>((set, get) => ({
  currentView: 'pos',
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

  menuItems: DEFAULT_MENU_ITEMS,
  setMenuItems: (menuItems) => set({ menuItems }),

  addStickByColor: (colorId) => {
    const stick = STICK_COLORS.find(s => s.id === colorId)
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

  addMenuItem: (item) => {
    const { shopSettings } = get()
    if (shopSettings.hapticEnabled) triggerHaptic(50)
    if (shopSettings.soundEnabled) playTapSound()

    set((state) => {
      const existingIndex = state.cart.findIndex(
        cItem => cItem.menuItemId === item.id
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
          cartItemId: `menu-${item.id}-${Date.now()}`,
          menuItemId: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
          stickColorId: item.stickColorId,
          category: item.category
        }
        return { cart: [...state.cart, newItem] }
      }
    })
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
      shopSettings 
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
  }
}))
