import React, { useState } from 'react'
import { Tag } from 'lucide-react'
import { STICK_COLORS } from '../lib/constants'
import { usePosStore } from '../store/usePosStore'
import type { StickColorId } from '../types'

export const StickQuickBar: React.FC = () => {
  const { cart, addStickByColor } = usePosStore()
  const [customPrice, setCustomPrice] = useState('')
  const [showCustomModal, setShowCustomModal] = useState(false)

  // Get current count for each stick color in cart
  const getColorCount = (colorId: StickColorId) => {
    return cart
      .filter(item => item.stickColorId === colorId)
      .reduce((sum, item) => sum + item.quantity, 0)
  }

  const handleCustomAdd = () => {
    const priceNum = parseFloat(customPrice)
    if (!isNaN(priceNum) && priceNum > 0) {
      usePosStore.getState().addMenuItem({
        id: `custom-${Date.now()}`,
        name: `ไม้พิเศษ ${priceNum}บ.`,
        price: priceNum,
        category: 'quick',
        isAvailable: true
      })
      setCustomPrice('')
      setShowCustomModal(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/80 shadow-xs mb-4">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
          <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
            ปุ่มคิดราคาตามสีไม้ (แตะเพื่อบวกจำนวนไม้ทันที)
          </h2>
        </div>
        <span className="text-xs text-slate-600 hidden sm:inline">
          ระบบสั่นตอบสนอง 50ms ทุกการแตะ
        </span>
      </div>

      {/* Grid of Big Color Buttons (Target height h-14 to h-16 as requested) */}
      <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-6 gap-2 sm:gap-2.5">
        {STICK_COLORS.map((stick) => {
          const count = getColorCount(stick.id)
          return (
            <button
              key={stick.id}
              onClick={() => addStickByColor(stick.id)}
              className={`relative h-14 sm:h-16 rounded-xl flex flex-col items-center justify-center font-extrabold shadow-sm transition-all duration-75 active:scale-95 active:shadow-inner cursor-pointer border ${stick.bgClass} ${stick.borderClass}`}
              title={`บวก ${stick.name} ${stick.price} บาท`}
            >
              <span className="text-xs sm:text-sm font-semibold opacity-95">
                {stick.name}
              </span>
              <span className="text-base sm:text-lg font-black leading-none mt-0.5">
                {stick.label}
              </span>

              {/* Count badge */}
              {count > 0 && (
                <span className="absolute -top-2 -right-2 bg-slate-900 text-white text-[11px] font-black min-w-5 h-5 px-1 rounded-full flex items-center justify-center shadow-md border-2 border-white animate-scale-in">
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Optional Custom Stick / Quick Price Add */}
      <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span className="text-[11px] sm:text-xs text-slate-600">
          💡 ทริค: แคชเชียร์สามารถแตะรัวๆ เพื่อนับไม้ลูกค้าทีละสีได้ทันที
        </span>
        <button
          onClick={() => setShowCustomModal(true)}
          className="flex items-center gap-1 text-red-600 hover:text-red-700 font-semibold px-2 py-1 rounded-md hover:bg-red-50 transition-colors"
        >
          <Tag className="w-3.5 h-3.5" />
          <span>+ ใส่ราคาพิเศษ</span>
        </button>
      </div>

      {/* Custom Price Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-xs w-full shadow-xl border border-slate-200">
            <h3 className="font-bold text-slate-900 text-base mb-1">ระบุราคาไม้พิเศษ</h3>
            <p className="text-xs text-slate-500 mb-3">กรอกราคาต่อไม้สำหรับเมนูพิเศษนอกเหนือจากสีปกติ</p>
            <div className="relative mb-4">
              <input
                type="number"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                placeholder="เช่น 40, 50"
                className="w-full h-12 px-3 text-lg font-bold text-slate-900 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500"
                autoFocus
              />
              <span className="absolute right-3 top-3 text-slate-400 font-bold">บาท</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCustomModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleCustomAdd}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-md"
              >
                เพิ่มลงตะกร้า
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
