import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getAnalytics, isSupported } from 'firebase/analytics'
import { 
  getDatabase, 
  ref, 
  set, 
  update, 
  remove,
  onValue, 
  off, 
  type Database 
} from 'firebase/database'
import type { Order, ShopSettings, MenuItem, SpicyOption, TableSession } from '../types'
import { getPendingSyncOrders, markOrderAsSynced } from './db'

let firebaseApp: FirebaseApp | null = null
let realtimeDb: Database | null = null
let isFirebaseConfigured = false

export function isFirebaseReady(): boolean {
  return isFirebaseConfigured && realtimeDb !== null
}

export function initFirebaseService(config: ShopSettings['firebaseConfig']): boolean {
  if (!config || !config.apiKey || !config.databaseURL || !config.projectId) {
    isFirebaseConfigured = false
    return false
  }

  try {
    const existingApps = getApps()
    if (existingApps.length > 0) {
      firebaseApp = existingApps[0]
    } else {
      firebaseApp = initializeApp(config)
    }

    realtimeDb = getDatabase(firebaseApp)
    isFirebaseConfigured = true
    console.log('[Firebase] Realtime Database initialized successfully')

    // Initialize Analytics if supported in this environment
    if (typeof window !== 'undefined' && config.measurementId) {
      isSupported().then((supported) => {
        if (supported && firebaseApp) {
          getAnalytics(firebaseApp)
          console.log('[Firebase] Analytics initialized successfully')
        }
      }).catch(() => {})
    }

    return true
  } catch (error) {
    console.error('[Firebase] Failed to initialize Firebase:', error)
    isFirebaseConfigured = false
    return false
  }
}

// Push an order to Firebase Realtime Database
export async function pushOrderToFirebase(order: Order): Promise<boolean> {
  if (!isFirebaseReady() || !realtimeDb) {
    return false
  }

  try {
    const orderRef = ref(realtimeDb, `orders/${order.id}`)
    await set(orderRef, {
      ...order,
      syncedAt: Date.now()
    })
    await markOrderAsSynced(order.id, order.id)
    return true
  } catch (error) {
    console.warn('[Firebase] Could not push order to Firebase (offline or permission error):', error)
    return false
  }
}

// Update order status in Firebase
export async function updateFirebaseOrderStatus(orderId: string, status: Order['status']): Promise<boolean> {
  if (!isFirebaseReady() || !realtimeDb) {
    return false
  }

  try {
    const orderRef = ref(realtimeDb, `orders/${orderId}`)
    await update(orderRef, {
      status,
      updatedAt: Date.now()
    })
    return true
  } catch (error) {
    console.warn('[Firebase] Could not update order status in Firebase:', error)
    return false
  }
}

// Update full order details in Firebase (for bill editing)
export async function updateFirebaseOrder(order: Order): Promise<boolean> {
  if (!isFirebaseReady() || !realtimeDb) return false
  try {
    const orderRef = ref(realtimeDb, `orders/${order.id}`)
    await update(orderRef, {
      ...order,
      updatedAt: Date.now()
    })
    return true
  } catch (error) {
    console.warn('[Firebase] Could not update order in Firebase:', error)
    return false
  }
}

// Delete order from Firebase (for bill deletion/cancellation)
export async function deleteFirebaseOrder(orderId: string): Promise<boolean> {
  if (!isFirebaseReady() || !realtimeDb) return false
  try {
    const orderRef = ref(realtimeDb, `orders/${orderId}`)
    await remove(orderRef)
    return true
  } catch (error) {
    console.warn('[Firebase] Could not delete order from Firebase:', error)
    return false
  }
}

// Listen to real-time order updates for Kitchen KDS
export function subscribeToFirebaseOrders(callback: (orders: Order[]) => void): () => void {
  if (!isFirebaseReady() || !realtimeDb) {
    return () => {}
  }

  const ordersRef = ref(realtimeDb, 'orders')
  
  onValue(ordersRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val()
      const orderList: Order[] = Object.values(data)
      callback(orderList)
    } else {
      callback([])
    }
  }, (error) => {
    console.warn('[Firebase] Error listening to orders:', error)
  })

  return () => {
    if (realtimeDb) {
      off(ordersRef)
    }
  }
}

// Sync all local pending orders up to Firebase
export async function syncPendingOrdersToFirebase(): Promise<{ success: number; failed: number }> {
  if (!isFirebaseReady() || !navigator.onLine) {
    return { success: 0, failed: 0 }
  }

  const pending = await getPendingSyncOrders()
  let success = 0
  let failed = 0

  for (const order of pending) {
    const ok = await pushOrderToFirebase(order)
    if (ok) {
      success++
    } else {
      failed++
    }
  }

  return { success, failed }
}

// Global online event listener to trigger auto-sync
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[Network] Back online! Starting auto-sync queue...')
    syncPendingOrdersToFirebase().catch(err => console.error('[Sync] Auto-sync error:', err))
  })
}

// Push menu items to Firebase
export async function syncMenuItemsToFirebase(items: MenuItem[]): Promise<boolean> {
  if (!isFirebaseReady() || !realtimeDb) return false
  try {
    const menuRef = ref(realtimeDb, 'menu')
    await set(menuRef, items)
    return true
  } catch (error) {
    console.warn('[Firebase] Could not sync menu to Firebase:', error)
    return false
  }
}

// Push spicy options to Firebase
export async function syncSpicyOptionsToFirebase(options: SpicyOption[]): Promise<boolean> {
  if (!isFirebaseReady() || !realtimeDb) return false
  try {
    const spicyRef = ref(realtimeDb, 'spicyOptions')
    await set(spicyRef, options)
    return true
  } catch (error) {
    console.warn('[Firebase] Could not sync spicy options to Firebase:', error)
    return false
  }
}

// Subscribe to real-time menu updates
export function subscribeToFirebaseMenu(callback: (items: MenuItem[]) => void): () => void {
  if (!isFirebaseReady() || !realtimeDb) return () => {}
  const menuRef = ref(realtimeDb, 'menu')
  onValue(menuRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val()
      if (Array.isArray(data)) {
        callback(data)
      } else if (typeof data === 'object' && data !== null) {
        callback(Object.values(data))
      }
    }
  }, (err) => console.warn('[Firebase] Menu subscribe error:', err))

  return () => {
    if (realtimeDb) off(menuRef)
  }
}

// Subscribe to real-time spicy options updates
export function subscribeToFirebaseSpicyOptions(callback: (options: SpicyOption[]) => void): () => void {
  if (!isFirebaseReady() || !realtimeDb) return () => {}
  const spicyRef = ref(realtimeDb, 'spicyOptions')
  onValue(spicyRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val()
      if (Array.isArray(data)) {
        callback(data)
      } else if (typeof data === 'object' && data !== null) {
        callback(Object.values(data))
      }
    }
  }, (err) => console.warn('[Firebase] Spicy options subscribe error:', err))

  return () => {
    if (realtimeDb) off(spicyRef)
  }
}

// ----------------------------------------------------
// Table Sessions Realtime Sync & Lockout
// ----------------------------------------------------
const sanitizeTableKey = (table: string): string => {
  return encodeURIComponent(table.trim()).replace(/\./g, '_')
}

// Push/Update a table session (occupied, billed, available)
export async function updateFirebaseTableSession(session: TableSession): Promise<boolean> {
  if (!isFirebaseReady() || !realtimeDb) return false
  try {
    const key = sanitizeTableKey(session.tableNumber)
    const sessionRef = ref(realtimeDb, `tableSessions/${key}`)
    await set(sessionRef, {
      ...session,
      syncedAt: Date.now()
    })
    return true
  } catch (error) {
    console.warn('[Firebase] Could not update table session in Firebase:', error)
    return false
  }
}

// Subscribe to all table sessions in realtime (for both Cashier, Kitchen, and Customers)
export function subscribeToFirebaseTableSessions(callback: (sessions: Record<string, TableSession>) => void): () => void {
  if (!isFirebaseReady() || !realtimeDb) return () => {}
  const sessionsRef = ref(realtimeDb, 'tableSessions')
  onValue(sessionsRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val() || {}
      const map: Record<string, TableSession> = {}
      Object.values(data).forEach((item: any) => {
        if (item && item.tableNumber) {
          map[item.tableNumber] = item as TableSession
        }
      })
      callback(map)
    } else {
      callback({})
    }
  }, (err) => console.warn('[Firebase] Error listening to table sessions:', err))

  return () => {
    if (realtimeDb) off(sessionsRef)
  }
}

