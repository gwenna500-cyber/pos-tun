import Dexie, { type Table } from 'dexie'
import type { Order, MenuItem } from '../types'
import { DEFAULT_MENU_ITEMS, DEFAULT_SHOP_SETTINGS } from './constants'

export class PosDatabase extends Dexie {
  orders!: Table<Order, string>
  menu!: Table<MenuItem, string>
  settings!: Table<{ key: string; value: any }, string>

  constructor() {
    super('PosTunDB')
    this.version(1).stores({
      orders: 'id, orderNumber, status, syncStatus, createdAt',
      menu: 'id, category, name, price, isAvailable',
      settings: 'key'
    })
  }
}

export const db = new PosDatabase()

// Seed initial data if tables are empty
export async function initializeDatabase(): Promise<void> {
  try {
    const menuCount = await db.menu.count()
    if (menuCount === 0) {
      await db.menu.bulkAdd(DEFAULT_MENU_ITEMS)
    } else {
      const firstItem = await db.menu.toCollection().first()
      if (firstItem && firstItem.stickColorId) {
        await db.menu.clear()
        await db.menu.bulkAdd(DEFAULT_MENU_ITEMS)
      }
    }

    const settingsCount = await db.settings.count()
    if (settingsCount === 0) {
      await db.settings.put({ key: 'shopSettings', value: DEFAULT_SHOP_SETTINGS })
      await db.settings.put({ key: 'dailyQueueCounter', value: { date: new Date().toISOString().slice(0, 10), count: 0 } })
    }
  } catch (err) {
    console.error('Error initializing Dexie DB:', err)
  }
}

// Get next queue number for the day (e.g. Q-01, Q-02)
export async function getNextQueueNumber(): Promise<string> {
  const today = new Date().toISOString().slice(0, 10)
  try {
    const record = await db.settings.get('dailyQueueCounter')
    let count = 1
    if (record && record.value && record.value.date === today) {
      count = (record.value.count || 0) + 1
    }
    await db.settings.put({ key: 'dailyQueueCounter', value: { date: today, count } })
    return `Q-${String(count).padStart(2, '0')}`
  } catch (err) {
    console.error('Error generating queue number:', err)
    return `Q-${Math.floor(10 + Math.random() * 90)}`
  }
}

// Save order locally
export async function saveOrderToDb(order: Order): Promise<void> {
  await db.orders.put(order)
}

// Get all orders from today
export async function getTodayOrders(): Promise<Order[]> {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const startTimestamp = startOfDay.getTime()

  return await db.orders
    .where('createdAt')
    .aboveOrEqual(startTimestamp)
    .reverse()
    .toArray()
}

// Get orders pending sync to Firebase
export async function getPendingSyncOrders(): Promise<Order[]> {
  return await db.orders
    .where('syncStatus')
    .equals('pending_sync')
    .toArray()
}

// Mark order as synced
export async function markOrderAsSynced(orderId: string, firebaseId?: string): Promise<void> {
  await db.orders.update(orderId, {
    syncStatus: 'synced',
    ...(firebaseId ? { firebaseId } : {})
  })
}

// Update order status (pending -> cooking -> ready -> completed)
export async function updateOrderStatusInDb(orderId: string, status: Order['status']): Promise<void> {
  const updates: Partial<Order> = {
    status,
    updatedAt: Date.now()
  }
  if (status === 'completed') {
    updates.completedAt = Date.now()
  }
  await db.orders.update(orderId, updates)
}
