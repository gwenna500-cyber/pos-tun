import React, { useState, useMemo } from 'react'
import { Search, Plus, Minus, X, Flame, Check } from 'lucide-react'
import { MENU_CATEGORIES, SPICY_LEVELS } from '../lib/constants'
import { usePosStore } from '../store/usePosStore'
import type { MenuItem, SpicyLevel } from '../types'

export const MenuCatalog: React.FC = () => {
  const { menuItems, cart, addMenuItem } = usePosStore()
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Modal state for selecting spicy level when choosing an item
  const [activeItem, setActiveItem] = useState<MenuItem | null>(null)
  const [selectedSpicy, setSelectedSpicy] = useState<SpicyLevel>('medium')
  const [itemQty, setItemQty] = useState<number>(1)
  const [itemNote, setItemNote] = useState<string>('')

  // Filtered menu items
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchCat = selectedCategory === 'all' || item.category === selectedCategory
      const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
      return matchCat && matchSearch
    })
  }, [menuItems, selectedCategory, searchQuery])

  // Get total quantity in cart for a menu item (combining all spicy levels)
  const getItemCartQty = (itemId: string) => {
    return cart
      .filter(c => c.menuItemId === itemId)
      .reduce((sum, c) => sum + c.quantity, 0)
  }

  // Handle clicking an item card
  const handleItemClick = (item: MenuItem) => {
    if (item.category === 'drink') {
      // Drinks don't need spicy level
      addMenuItem(item)
    } else {
      // Open spicy selection modal
      setActiveItem(item)
      setSelectedSpicy('medium')
      setItemQty(1)
      setItemNote('')
    }
  }

  // Confirm adding item with chosen spicy level
  const handleConfirmAdd = () => {
    if (!activeItem) return
    addMenuItem(activeItem, selectedSpicy, itemNote.trim(), itemQty)
    setActiveItem(null)
  }

  // Get Category Name for item
  const getCategoryName = (catId: string) => {
    return MENU_CATEGORIES.find(c => c.id === catId)?.name || 'เมนูทั่วไป'
  }

  return (
    <div className="flex flex-col h-full">
      {/* Horizontal Category Tabs & Search Bar */}
      <div className="space-y-2.5 mb-3.5">
        {/* Search bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาเมนูหม่าล่าทอด เช่น สามชั้น, เอ็นข้อไก่, เฟรนช์ฟรายส์..."
            className="w-full h-11 pl-10 pr-4 text-sm bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500 shadow-2xs placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-md"
            >
              ล้าง
            </button>
          )}
        </div>

        {/* Horizontal Category Pill Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-sm font-semibold">
          {MENU_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-xl transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                {cat.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Menu Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 overflow-y-auto pr-0.5">
        {filteredItems.map((item) => {
          const qty = getItemCartQty(item.id)

          return (
            <div
              key={item.id}
              onClick={() => handleItemClick(item)}
              className="relative bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-red-300 transition-all cursor-pointer flex flex-col justify-between active:scale-[0.98] group"
            >
              <div>
                {/* Header: Category Badge & Price */}
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-100">
                    {getCategoryName(item.category)}
                  </span>
                  <span className="font-black text-lg text-red-600">
                    {item.price} <span className="text-xs font-bold text-slate-600">฿</span>
                  </span>
                </div>

                {/* Name */}
                <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug line-clamp-2 group-hover:text-red-600 transition-colors">
                  {item.name}
                </h3>

                {/* Description */}
                {item.description && (
                  <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                    {item.description}
                  </p>
                )}
              </div>

              {/* Bottom Action Area */}
              <div className="mt-3.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-400">
                  {item.category === 'drink' ? 'แตะเพิ่มทันที' : 'แตะเลือกระดับเผ็ด'}
                </span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                  qty > 0 
                    ? 'bg-red-600 text-white font-black shadow-xs text-sm'
                    : 'bg-slate-100 text-slate-600 group-hover:bg-red-100 group-hover:text-red-600'
                }`}>
                  {qty > 0 ? qty : <Plus className="w-4 h-4" />}
                </div>
              </div>

              {/* Active Selection Outline */}
              {qty > 0 && (
                <div className="absolute inset-0 rounded-2xl border-2 border-red-500 pointer-events-none" />
              )}
            </div>
          )
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="bg-white rounded-2xl p-8 border border-dashed border-slate-300 text-center my-auto">
          <p className="text-slate-500 text-sm font-medium">ไม่พบเมนูที่ค้นหา</p>
          <button
            onClick={() => { setSearchQuery(''); setSelectedCategory('all') }}
            className="mt-2 text-xs font-bold text-red-600 hover:underline"
          >
            แสดงเมนูทั้งหมด
          </button>
        </div>
      )}

      {/* Spicy Level Selection Modal (Opens right after tapping a menu item) */}
      {activeItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-red-600">
                  เลือกระดับความเผ็ดชา
                </span>
                <h3 className="text-lg font-black text-slate-900 leading-tight">
                  {activeItem.name}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black text-red-600">
                  {activeItem.price * itemQty} ฿
                </span>
                <button
                  onClick={() => setActiveItem(null)}
                  className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto space-y-4">
              {/* Spicy Level Options Grid */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-red-600" />
                  <span>ระดับความเผ็ดชาสำหรับเมนูนี้:</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SPICY_LEVELS.map((spicy) => {
                    const isSelected = selectedSpicy === spicy.id
                    return (
                      <button
                        key={spicy.id}
                        type="button"
                        onClick={() => setSelectedSpicy(spicy.id)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-red-600 text-white border-red-600 shadow-md ring-2 ring-red-300'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-black text-sm">
                            {spicy.label}
                          </span>
                          {isSelected && <Check className="w-4 h-4 text-white" />}
                        </div>
                        <span className={`text-[11px] mt-1 line-clamp-1 ${
                          isSelected ? 'text-red-100' : 'text-slate-400'
                        }`}>
                          {spicy.desc}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Quantity Selector */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-bold text-slate-700">จำนวนที่ต้องการ:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setItemQty(Math.max(1, itemQty - 1))}
                    className="w-9 h-9 rounded-xl bg-white border border-slate-300 flex items-center justify-center text-slate-700 font-bold active:scale-95"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center font-black text-lg text-slate-900">
                    {itemQty}
                  </span>
                  <button
                    type="button"
                    onClick={() => setItemQty(itemQty + 1)}
                    className="w-9 h-9 rounded-xl bg-white border border-slate-300 flex items-center justify-center text-slate-700 font-bold active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Special Note (Optional) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  หมายเหตุเพิ่มเติม (ถ้ามี):
                </label>
                <input
                  type="text"
                  value={itemNote}
                  onChange={(e) => setItemNote(e.target.value)}
                  placeholder="เช่น ทอดกรอบแห้งๆ, ไม่ใส่กระเทียม"
                  className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>

            {/* Modal Footer / Add to Cart */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex gap-2">
              <button
                type="button"
                onClick={() => setActiveItem(null)}
                className="py-3 px-4 rounded-xl border border-slate-300 bg-white text-slate-700 font-bold text-sm hover:bg-slate-100"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmAdd}
                className="flex-1 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-black text-base shadow-md shadow-red-200 flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                <span>เพิ่มลงตะกร้า ({activeItem.price * itemQty} ฿)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
