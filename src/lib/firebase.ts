import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { 
  getDatabase, 
  ref, 
  set, 
  update, 
  onValue, 
  off, 
  type Database 
} from 'firebase/database'
import type { Order, ShopSettings } from '../types'
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
