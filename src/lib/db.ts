import Dexie, { type Table } from 'dexie'
import type { Order, MenuItem, SpicyOption, OrderAddonOption, TableSession } from '../types'
import { DEFAULT_MENU_ITEMS, DEFAULT_SHOP_SETTINGS, DEFAULT_SPICY_OPTIONS, DEFAULT_ORDER_ADDONS } from './constants'

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

// Update full order details in IndexedDB
export async function updateOrderInDb(updatedOrder: Order): Promise<void> {
  await db.orders.put({
    ...updatedOrder,
    updatedAt: Date.now()
  })
}

// Delete order from IndexedDB
export async function deleteOrderFromDb(orderId: string): Promise<void> {
  await db.orders.delete(orderId)
}

// Menu items CRUD
export async function getAllMenuItemsFromDb(): Promise<MenuItem[]> {
  try {
    const items = await db.menu.toArray()
    if (items.length === 0) {
      await db.menu.bulkAdd(DEFAULT_MENU_ITEMS)
      return DEFAULT_MENU_ITEMS
    }
    return items
  } catch (err) {
    console.error('Error loading menu from db:', err)
    return DEFAULT_MENU_ITEMS
  }
}

export async function saveMenuItemToDb(item: MenuItem): Promise<void> {
  await db.menu.put(item)
}

export async function deleteMenuItemFromDb(id: string): Promise<void> {
  await db.menu.delete(id)
}

export async function resetMenuToDefaultsInDb(): Promise<MenuItem[]> {
  await db.menu.clear()
  await db.menu.bulkAdd(DEFAULT_MENU_ITEMS)
  return DEFAULT_MENU_ITEMS
}

// Spicy options CRUD
export async function getSpicyOptionsFromDb(): Promise<SpicyOption[]> {
  try {
    const record = await db.settings.get('spicyOptions')
    if (record && record.value && Array.isArray(record.value) && record.value.length > 0) {
      // Remove dry and extra_sesame from spicy levels because they are now order-level checkout addons
      const filtered = record.value.filter((s: SpicyOption) => s.id !== 'dry' && s.id !== 'extra_sesame')
      if (filtered.length !== record.value.length) {
        await db.settings.put({ key: 'spicyOptions', value: filtered })
      }
      return filtered.length > 0 ? filtered : DEFAULT_SPICY_OPTIONS
    }
    await db.settings.put({ key: 'spicyOptions', value: DEFAULT_SPICY_OPTIONS })
    return DEFAULT_SPICY_OPTIONS
  } catch (err) {
    console.error('Error loading spicy options from db:', err)
    return DEFAULT_SPICY_OPTIONS
  }
}

export async function saveSpicyOptionsToDb(options: SpicyOption[]): Promise<void> {
  await db.settings.put({ key: 'spicyOptions', value: options })
}

export async function resetSpicyToDefaultsInDb(): Promise<SpicyOption[]> {
  await db.settings.put({ key: 'spicyOptions', value: DEFAULT_SPICY_OPTIONS })
  return DEFAULT_SPICY_OPTIONS
}

// Order Addon options CRUD
export async function getOrderAddonOptionsFromDb(): Promise<OrderAddonOption[]> {
  try {
    const record = await db.settings.get('orderAddonOptions')
    if (record && record.value && Array.isArray(record.value) && record.value.length > 0) {
      return record.value
    }
    await db.settings.put({ key: 'orderAddonOptions', value: DEFAULT_ORDER_ADDONS })
    return DEFAULT_ORDER_ADDONS
  } catch (err) {
    console.error('Error loading order addon options from db:', err)
    return DEFAULT_ORDER_ADDONS
  }
}

export async function saveOrderAddonOptionsToDb(options: OrderAddonOption[]): Promise<void> {
  await db.settings.put({ key: 'orderAddonOptions', value: options })
}

export async function resetOrderAddonsToDefaultsInDb(): Promise<OrderAddonOption[]> {
  await db.settings.put({ key: 'orderAddonOptions', value: DEFAULT_ORDER_ADDONS })
  return DEFAULT_ORDER_ADDONS
}

// ----------------------------------------------------
// Table Sessions local persistence
// ----------------------------------------------------
export async function getTableSessionsFromDb(): Promise<Record<string, TableSession>> {
  try {
    const record = await db.settings.get('tableSessions')
    if (record && record.value && typeof record.value === 'object') {
      return record.value
    }
    return {}
  } catch (err) {
    console.error('Error loading table sessions from db:', err)
    return {}
  }
}

export async function saveTableSessionsToDb(sessions: Record<string, TableSession>): Promise<void> {
  try {
    await db.settings.put({ key: 'tableSessions', value: sessions })
  } catch (err) {
    console.error('Error saving table sessions to db:', err)
  }
}

