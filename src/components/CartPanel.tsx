import React from 'react'
import { 
  Trash2, 
  Plus, 
  Minus, 
  Flame, 
  ShoppingBag, 
  CreditCard, 
  X 
} from 'lucide-react'
import { usePosStore } from '../store/usePosStore'
import { SPICY_LEVELS, COOKING_METHODS, DINING_TYPES, STICK_COLORS } from '../lib/constants'

interface CartPanelProps {
  isMobileDrawer?: boolean
}

export const CartPanel: React.FC<CartPanelProps> = ({ isMobileDrawer = false }) => {
  const {
    cart,
    incrementCartItem,
    decrementCartItem,
    clearCart,
    spicyLevel,
    setSpicyLevel,
    cookingMethod,
    setCookingMethod,
    diningType,
    setDiningType,
    customerQueue,
    setCustomerQueue,
    orderNotes,
    setOrderNotes,
    discount,
    openPaymentModal,
    toggleMobileCart
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
              {totalItemsCount} ไม้/รายการ
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
              แตะปุ่มสีไม้หรือเมนูด้านซ้ายเพื่อเริ่มสั่งอาหาร
            </p>
          </div>
        ) : (
          cart.map((item) => {
            const stickInfo = item.stickColorId ? STICK_COLORS.find(s => s.id === item.stickColorId) : null
            return (
              <div
                key={item.cartItemId}
                className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition-colors"
              >
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    {stickInfo && (
                      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${stickInfo.bgClass.split(' ')[0]}`} />
                    )}
                    <h4 className="font-bold text-slate-900 text-sm truncate">
                      {item.name}
                    </h4>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">
                    {item.price}฿ × {item.quantity} = <strong className="text-slate-800">{item.price * item.quantity}฿</strong>
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

      {/* Cooking Modifiers & Order Settings */}
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

        {/* Cooking Method (ย่างหม่าล่า / ทอดกรอบ / ต้ม) */}
        <div>
          <label className="block text-[11px] font-bold text-slate-600 mb-1">
            วิธีปรุงอาหาร
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {COOKING_METHODS.map((m) => {
              const isSelected = cookingMethod === m.id
              return (
                <button
                  key={m.id}
                  onClick={() => setCookingMethod(m.id)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center border ${
                    isSelected
                      ? 'bg-red-50 border-red-500 text-red-700 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {m.label.split(' ')[0]}
                </button>
              )
            })}
          </div>
        </div>

        {/* Spicy Level (เผ็ดน้อย / เผ็ดกลาง / เผ็ดชา / พริกแยก) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-red-600" />
              <span>ระดับความเผ็ดชา</span>
            </label>
            <span className="text-[10px] text-red-600 font-semibold">
              {SPICY_LEVELS.find(s => s.id === spicyLevel)?.label}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
            {SPICY_LEVELS.slice(0, 4).map((s) => {
              const isSelected = spicyLevel === s.id
              return (
                <button
                  key={s.id}
                  onClick={() => setSpicyLevel(s.id)}
                  className={`py-1.5 px-1 rounded-lg text-[11px] font-bold transition-all border text-center ${
                    isSelected
                      ? 'bg-red-600 border-red-600 text-white shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {s.label.split(' ')[0]}
                </button>
              )
            })}
          </div>

          {/* Additional modifiers row (พริกแยก / ย่างแห้ง / โรยงา) */}
          <div className="grid grid-cols-3 gap-1 mt-1">
            {SPICY_LEVELS.slice(4).map((s) => {
              const isSelected = spicyLevel === s.id
              return (
                <button
                  key={s.id}
                  onClick={() => setSpicyLevel(s.id)}
                  className={`py-1 px-1 rounded-md text-[10px] font-semibold border transition-all text-center ${
                    isSelected
                      ? 'bg-red-600 border-red-600 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {s.label.split(' ')[0]}
                </button>
              )
            })}
          </div>
        </div>

        {/* Notes Input */}
        <div>
          <input
            type="text"
            value={orderNotes}
            onChange={(e) => setOrderNotes(e.target.value)}
            placeholder="หมายเหตุเพิ่มเติม เช่น ไม่ใส่ผักชี, เกรียมๆ..."
            className="w-full h-8 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-red-500"
          />
        </div>

        {/* Totals & Grand Total Summary */}
        <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/80 space-y-1 text-xs">
          <div className="flex justify-between text-slate-500">
            <span>ยอดรวม ({totalItemsCount} ไม้):</span>
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
            <span className="text-red-600 text-xl">{grandTotal} ฿</span>
          </div>
        </div>

        {/* Big Red Checkout Button (User requirement: bg-red-600 hover:bg-red-700 text-white h-16 font-bold text-xl) */}
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
