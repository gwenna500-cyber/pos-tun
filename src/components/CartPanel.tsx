import React from 'react'
import { 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingBag, 
  CreditCard, 
  X,
  Check,
  Sparkles,
  Flame
} from 'lucide-react'
import { usePosStore } from '../store/usePosStore'
import { SPICY_LEVELS, DINING_TYPES } from '../lib/constants'

interface CartPanelProps {
  isMobileDrawer?: boolean
}

export const CartPanel: React.FC<CartPanelProps> = ({ isMobileDrawer = false }) => {
  const {
    cart,
    incrementCartItem,
    decrementCartItem,
    clearCart,
    diningType,
    setDiningType,
    customerQueue,
    setCustomerQueue,
    orderNotes,
    setOrderNotes,
    discount,
    openPaymentModal,
    toggleMobileCart,
    spicyOptions,
    spicyLevel,
    setSpicyLevel,
    orderAddons,
    toggleOrderAddon
  } = usePosStore()

  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const grandTotal = Math.max(0, subtotal - (discount || 0))

  return (
    <div className={`bg-white flex flex-col h-full border-slate-200 ${
      isMobileDrawer ? 'p-4' : 'border-l p-4 shadow-sm'
    }`}>
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-600">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-900 text-base leading-none">
              ตะกร้าสินค้า
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              {totalItemsCount} รายการ
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-red-600 hover:text-red-700 font-semibold px-2 py-1 rounded-md hover:bg-red-50 flex items-center gap-1 transition-colors"
              title="ล้างตะกร้า"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>ล้าง</span>
            </button>
          )}
          {isMobileDrawer && (
            <button
              onClick={() => toggleMobileCart(false)}
              className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto py-2.5 space-y-2 min-h-0">
        {cart.length === 0 ? (
          <div className="h-44 sm:h-52 flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <ShoppingBag className="w-10 h-10 mb-2 text-slate-300 stroke-1" />
            <p className="text-sm font-semibold text-slate-600">ยังไม่มีรายการในตะกร้า</p>
            <p className="text-xs text-slate-400 mt-0.5">
              แตะเมนูหม่าล่าทอดเพื่อเริ่มสั่งอาหาร
            </p>
          </div>
        ) : (
          cart.map((item) => {
            const spicy = item.spicyLevel ? (spicyOptions.find(s => s.id === item.spicyLevel) || SPICY_LEVELS.find(s => s.id === item.spicyLevel)) : null

            return (
              <div
                key={item.cartItemId}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition-colors"
              >
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="font-bold text-slate-900 text-sm truncate">
                      {item.name}
                    </h4>
                    {spicy && (
                      <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black border ${spicy.badgeClass}`}>
                        {spicy.label.split(' ')[0]}
                      </span>
                    )}
                    {item.addons && item.addons.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        {item.addons.join(' · ')}
                      </span>
                    )}
                  </div>
                  {item.note && (
                    <span className="text-[11px] text-amber-700 font-medium block truncate">
                      โน้ต: {item.note}
                    </span>
                  )}
                  <span className="text-xs text-slate-500 font-medium mt-0.5 block">
                    {item.price}฿ × {item.quantity} = <strong className="text-emerald-700 font-bold">{item.price * item.quantity}฿</strong>
                  </span>
                </div>

                {/* Qty +/- Controls */}
                <div className="flex items-center gap-1 bg-white rounded-lg border border-slate-200 p-0.5 shadow-2xs">
                  <button
                    onClick={() => decrementCartItem(item.cartItemId)}
                    className="w-7 h-7 flex items-center justify-center rounded text-slate-600 hover:bg-slate-100 active:scale-95 transition-all"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-7 text-center font-extrabold text-sm text-slate-900">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => incrementCartItem(item.cartItemId)}
                    className="w-7 h-7 flex items-center justify-center rounded text-slate-600 hover:bg-slate-100 active:scale-95 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Order Settings & Checkout */}
      <div className="border-t border-slate-200 pt-3 space-y-3 bg-white">
        {/* Dining Type & Table/Queue */}
        <div className="grid grid-cols-2 gap-2">
          {/* Table / Queue Input */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              โต๊ะ / เลขคิว
            </label>
            <input
              type="text"
              value={customerQueue}
              onChange={(e) => setCustomerQueue(e.target.value)}
              placeholder="เว้นว่าง = รันคิวอัตโนมัติ"
              className="w-full h-9 px-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-red-500"
            />
          </div>

          {/* Dining Type (กลับบ้าน / ทานที่ร้าน) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              สถานที่ทาน
            </label>
            <div className="flex gap-1 h-9">
              {DINING_TYPES.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDiningType(d.id)}
                  className={`flex-1 text-[11px] font-bold rounded-lg transition-all ${
                    diningType === d.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Spicy Level (ตอนกำลังจะคิดตังค์) */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-red-600" />
              <span>ระดับความเผ็ดของบิลนี้:</span>
            </span>
            <span className="text-[10px] text-red-600 font-semibold">*เลือก 1 อย่าง</span>
          </label>
          <div className="grid grid-cols-3 gap-1">
            {spicyOptions.filter(s => s.isAvailable !== false && s.id !== 'dry' && s.id !== 'extra_sesame').map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSpicyLevel(s.id)}
                className={`py-1.5 px-1.5 rounded-lg text-xs font-bold transition-all truncate border text-center cursor-pointer ${
                  spicyLevel === s.id
                    ? 'bg-red-600 text-white border-red-600 shadow-2xs ring-1 ring-red-300'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {s.label.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Extra Order Options (ตอนกำลังจะคิดตังค์) */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>ตัวเลือกพิเศษของบิลนี้ (เลือกได้หลายอย่าง):</span>
            </span>
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => toggleOrderAddon('โรยงาขาวคั่วเยอะๆ')}
              className={`p-2 rounded-xl border text-left transition-all text-xs font-bold flex items-center justify-between cursor-pointer ${
                orderAddons.includes('โรยงาขาวคั่วเยอะๆ')
                  ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="truncate">🌾 โรยงาขาวคั่วเยอะๆ</div>
              {orderAddons.includes('โรยงาขาวคั่วเยอะๆ') && <Check className="w-3.5 h-3.5 text-white flex-shrink-0" />}
            </button>

            <button
              type="button"
              onClick={() => toggleOrderAddon('ทอดกรอบแห้งพิเศษ')}
              className={`p-2 rounded-xl border text-left transition-all text-xs font-bold flex items-center justify-between cursor-pointer ${
                orderAddons.includes('ทอดกรอบแห้งพิเศษ')
                  ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="truncate">🍟 ทอดกรอบแห้งพิเศษ</div>
              {orderAddons.includes('ทอดกรอบแห้งพิเศษ') && <Check className="w-3.5 h-3.5 text-white flex-shrink-0" />}
            </button>
          </div>
        </div>

        {/* General Notes Input */}
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">
            หมายเหตุของบิล
          </label>
          <input
            type="text"
            value={orderNotes}
            onChange={(e) => setOrderNotes(e.target.value)}
            placeholder="หมายเหตุเพิ่มเติมสำหรับบิลนี้..."
            className="w-full h-8 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-red-500"
          />
        </div>

        {/* Totals & Grand Total Summary */}
        <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/80 space-y-1 text-xs">
          <div className="flex justify-between text-slate-500">
            <span>ยอดรวม ({totalItemsCount} รายการ):</span>
            <span className="font-semibold text-slate-800">{subtotal} ฿</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-emerald-600 font-semibold">
              <span>ส่วนลด:</span>
              <span>-{discount} ฿</span>
            </div>
          )}
          <div className="flex justify-between text-base font-black text-slate-900 pt-1 border-t border-slate-200">
            <span>ยอดสุทธิ:</span>
            <span className="text-slate-900 text-xl font-black">{grandTotal} <span className="text-sm font-bold text-slate-500">฿</span></span>
          </div>
        </div>

        {/* Big Red Checkout Button */}
        <button
          onClick={openPaymentModal}
          disabled={cart.length === 0}
          className={`w-full h-14 sm:h-16 rounded-2xl flex items-center justify-center gap-2.5 font-black text-lg sm:text-xl shadow-lg transition-all duration-100 cursor-pointer ${
            cart.length > 0
              ? 'bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white shadow-red-200'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
          }`}
        >
          <CreditCard className="w-6 h-6" />
          <span>ชำระเงิน {grandTotal > 0 ? `${grandTotal} ฿` : ''}</span>
        </button>
      </div>
    </div>
  )
}
