import React, { useState, useEffect } from 'react'
import { 
  X, 
  Trash2, 
  Plus, 
  Minus, 
  Check, 
  Flame, 
  Sparkles, 
  Banknote, 
  QrCode
} from 'lucide-react'
import { usePosStore } from '../store/usePosStore'
import type { Order, CartItem, PaymentMethod, SpicyLevel } from '../types'

interface EditOrderModalProps {
  order: Order | null
  isOpen: boolean
  onClose: () => void
  onSaveSuccess: (updatedOrder: Order) => void
  onDeleteSuccess: (orderId: string) => void
}

export const EditOrderModal: React.FC<EditOrderModalProps> = ({
  order,
  isOpen,
  onClose,
  onSaveSuccess,
  onDeleteSuccess
}) => {
  const { menuItems, spicyOptions, orderAddonOptions, updateExistingOrder, deleteExistingOrder } = usePosStore()

  const [items, setItems] = useState<CartItem[]>([])
  const [discount, setDiscount] = useState<number>(0)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [spicyLevel, setSpicyLevel] = useState<SpicyLevel>('medium')
  const [orderAddons, setOrderAddons] = useState<string[]>([])
  const [notes, setNotes] = useState<string>('')
  const [isAddingNewItem, setIsAddingNewItem] = useState(false)
  const [selectedMenuItemId, setSelectedMenuItemId] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (order) {
      setItems(JSON.parse(JSON.stringify(order.items || [])))
      setDiscount(order.discount || 0)
      setPaymentMethod(order.paymentMethod || 'cash')
      setSpicyLevel(order.spicyLevel || 'medium')
      setOrderAddons(order.orderAddons || [])
      setNotes(order.notes || '')
      setIsAddingNewItem(false)
      setSelectedMenuItemId('')
    }
  }, [order, isOpen])

  if (!isOpen || !order) return null

  // Calculate live totals
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const totalItemsCount = items.reduce((sum, item) => sum + item.quantity, 0)
  const grandTotal = Math.max(0, subtotal - discount)

  // Handlers for items
  const handleQuantityChange = (index: number, delta: number) => {
    setItems(prev => {
      const next = [...prev]
      const newQty = next[index].quantity + delta
      if (newQty <= 0) {
        return next.filter((_, i) => i !== index)
      } else {
        next[index] = { ...next[index], quantity: newQty }
        return next
      }
    })
  }

  const handlePriceChange = (index: number, newPrice: number) => {
    setItems(prev => {
      const next = [...prev]
      next[index] = { ...next[index], price: Math.max(0, isNaN(newPrice) ? 0 : newPrice) }
      return next
    })
  }

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  const handleAddNewItem = () => {
    if (!selectedMenuItemId) return
    const menuItem = menuItems.find(m => m.id === selectedMenuItemId)
    if (!menuItem) return

    setItems(prev => [
      ...prev,
      {
        cartItemId: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        menuItemId: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: 1,
        category: menuItem.category
      }
    ])
    setSelectedMenuItemId('')
    setIsAddingNewItem(false)
  }

  const toggleAddon = (addon: string) => {
    setOrderAddons(prev => 
      prev.includes(addon) ? prev.filter(a => a !== addon) : [...prev, addon]
    )
  }

  const handleSave = async () => {
    if (items.length === 0) {
      alert('บิลต้องมีรายการอาหารอย่างน้อย 1 รายการ หรือกด "ลบบิลนี้" หากต้องการยกเลิกบิล')
      return
    }

    setIsSaving(true)
    try {
      const updated: Order = {
        ...order,
        items,
        totalItemsCount,
        subtotal,
        discount,
        grandTotal,
        paymentMethod,
        spicyLevel,
        orderAddons,
        notes: notes.trim(),
        updatedAt: Date.now()
      }

      await updateExistingOrder(updated)
      onSaveSuccess(updated)
      onClose()
    } catch (err: any) {
      alert(`ไม่สามารถบันทึกการแก้ไขบิลได้: ${err.message || 'เกิดข้อผิดพลาด'}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`ยืนยันการลบบิล ${order.orderNumber} หรือไม่?\nยอดขาย ${order.grandTotal} ฿ จะถูกยกเลิกออกจากรายงานยอดขายทันที`)) {
      return
    }

    setIsSaving(true)
    try {
      await deleteExistingOrder(order.id)
      onDeleteSuccess(order.id)
      onClose()
    } catch (err: any) {
      alert(`ไม่สามารถลบบิลได้: ${err.message || 'เกิดข้อผิดพลาด'}`)
    } finally {
      setIsSaving(false)
    }
  }

  const availableSpicy = spicyOptions.filter(s => s.isAvailable !== false && s.id !== 'dry' && s.id !== 'extra_sesame')

  return (
    <div className="fixed inset-0 z-[110] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <span>แก้ไขบิล {order.orderNumber}</span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                {order.tableOrQueue}
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              เวลาสั่ง: {new Date(order.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* Section: Items List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>รายการอาหารในบิล:</span>
                <span className="text-xs font-normal text-slate-400">({items.length} รายการ)</span>
              </label>
              
              {!isAddingNewItem && (
                <button
                  type="button"
                  onClick={() => setIsAddingNewItem(true)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>เพิ่มเมนูในบิลนี้</span>
                </button>
              )}
            </div>

            {/* Quick Add Menu Dropdown */}
            {isAddingNewItem && (
              <div className="p-3 bg-indigo-50/80 rounded-2xl border border-indigo-200 mb-3 space-y-2 animate-fade-in">
                <div className="text-xs font-bold text-indigo-950">เลือกเมนูที่ต้องการเพิ่มเข้าบิล:</div>
                <div className="flex gap-2">
                  <select
                    value={selectedMenuItemId}
                    onChange={(e) => setSelectedMenuItemId(e.target.value)}
                    className="flex-1 h-9 px-3 text-xs bg-white border border-indigo-300 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- เลือกเมนูอาหาร --</option>
                    {menuItems.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.price} ฿)
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddNewItem}
                    disabled={!selectedMenuItemId}
                    className="h-9 px-3 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 disabled:opacity-40 cursor-pointer"
                  >
                    เพิ่ม
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingNewItem(false)}
                    className="h-9 px-2.5 bg-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-300 cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                </div>
              </div>
            )}

            {/* Items Table / Cards */}
            <div className="space-y-2">
              {items.length === 0 ? (
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-center text-xs text-amber-800 font-medium">
                  ⚠️ ยังไม่มีรายการอาหารในบิลนี้ โปรดเพิ่มเมนูหรือกดยกเลิก
                </div>
              ) : (
                items.map((item, idx) => (
                  <div key={item.cartItemId || idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-200/90 flex items-center justify-between gap-3 text-xs">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 truncate">{item.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-slate-500 text-[11px]">ราคาต่อหน่วย:</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            value={item.price}
                            onChange={(e) => handlePriceChange(idx, Number(e.target.value))}
                            className="w-16 h-7 px-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 text-right"
                          />
                          <span className="text-[11px] text-slate-500">฿</span>
                        </div>
                      </div>
                    </div>

                    {/* Stepper Quantity */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(idx, -1)}
                        className="w-7 h-7 rounded-lg bg-white border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-100 active:scale-95 cursor-pointer font-bold"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center font-black text-slate-900 text-sm">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(idx, 1)}
                        className="w-7 h-7 rounded-lg bg-white border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-100 active:scale-95 cursor-pointer font-bold"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Item Total Price */}
                    <div className="w-16 text-right font-black text-slate-900 text-sm flex-shrink-0">
                      {item.price * item.quantity} ฿
                    </div>

                    {/* Delete Item */}
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition-colors cursor-pointer flex-shrink-0"
                      title="ลบรายการนี้"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Section: Spicy Level */}
          <div className="p-3 bg-red-50/70 rounded-2xl border border-red-200/80 space-y-2">
            <label className="text-xs font-bold text-red-950 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-red-600" />
              <span>ระดับความเผ็ดของบิลนี้:</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {availableSpicy.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSpicyLevel(s.id)}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                    spicyLevel === s.id
                      ? 'bg-red-600 text-white border-red-600 shadow-xs ring-2 ring-red-300'
                      : 'bg-white border-red-200 text-slate-700 hover:bg-red-50'
                  }`}
                >
                  {s.label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Section: Order Addons */}
          {(() => {
            const availableOptions = orderAddonOptions.filter(a => a.isAvailable !== false)
            const combinedLabels = Array.from(new Set([
              ...availableOptions.map(a => a.label),
              ...orderAddons
            ]))

            if (combinedLabels.length === 0) return null

            return (
              <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-200/80 space-y-2">
                <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>ตัวเลือกพิเศษ:</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {combinedLabels.map((addonLabel) => {
                    const active = orderAddons.includes(addonLabel)
                    const optionMeta = orderAddonOptions.find(o => o.label === addonLabel)
                    const icon = optionMeta?.icon || (addonLabel.includes('งา') ? '🌾' : addonLabel.includes('กรอบ') ? '🍟' : '✨')

                    return (
                      <button
                        key={addonLabel}
                        type="button"
                        onClick={() => toggleAddon(addonLabel)}
                        className={`py-1.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                          active
                            ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                            : 'bg-white border-amber-200 text-slate-700 hover:bg-amber-100/60'
                        }`}
                      >
                        <span>{icon}</span>
                        <span>{addonLabel}</span>
                        {active && <Check className="w-3.5 h-3.5 text-white ml-0.5" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })()}

          {/* Section: Notes & Discount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                หมายเหตุ:
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="เช่น ทานที่ร้าน, แยกจาน"
                className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ส่วนลด (บาท):
              </label>
              <input
                type="number"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))}
                className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Section: Payment Method */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              ช่องทางการชำระเงิน:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs cursor-pointer transition-all ${
                  paymentMethod === 'cash'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Banknote className="w-4 h-4" />
                <span>เงินสด</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('promptpay')}
                className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs cursor-pointer transition-all ${
                  paymentMethod === 'promptpay'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>พร้อมเพย์ QR</span>
              </button>
            </div>
          </div>

          {/* Live Summary Box */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600 font-medium">
              <span>รวม {totalItemsCount} ชิ้น:</span>
              <span>{subtotal} ฿</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-red-600 font-semibold">
                <span>ส่วนลด:</span>
                <span>-{discount} ฿</span>
              </div>
            )}
            <div className="pt-1.5 border-t border-slate-200 flex justify-between items-center font-black text-sm text-slate-900">
              <span>ยอดสุทธิใหม่:</span>
              <span className="text-xl text-emerald-600 font-black">{grandTotal} ฿</span>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            disabled={isSaving}
            onClick={handleDelete}
            className="py-2.5 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="ลบบิลนี้ออกจากประวัติการขาย"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>ลบบิลนี้</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSaving}
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs shadow-md shadow-emerald-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
