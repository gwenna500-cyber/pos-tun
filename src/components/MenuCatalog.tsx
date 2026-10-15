import React, { useState, useMemo } from 'react'
import { Search, Plus } from 'lucide-react'
import { MENU_CATEGORIES } from '../lib/constants'
import { usePosStore } from '../store/usePosStore'
import type { MenuItem } from '../types'

export const MenuCatalog: React.FC = () => {
  const { menuItems, cart, addMenuItem } = usePosStore()
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Filtered menu items
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchCat = selectedCategory === 'all' || item.category === selectedCategory
      const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
      return matchCat && matchSearch
    })
  }, [menuItems, selectedCategory, searchQuery])

  // Get total quantity in cart for a menu item
  const getItemCartQty = (itemId: string) => {
    return cart
      .filter(c => c.menuItemId === itemId)
      .reduce((sum, c) => sum + c.quantity, 0)
  }

  // Handle clicking an item card (direct add, spicy is chosen at checkout)
  const handleItemClick = (item: MenuItem) => {
    if (item.isAvailable === false) {
      alert(`ขออภัย เมนู "${item.name}" สินค้าหมดชั่วคราว`)
      return
    }
    addMenuItem(item)
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
          const isAvailable = item.isAvailable !== false

          return (
            <div
              key={item.id}
              onClick={() => handleItemClick(item)}
              className={`relative bg-white rounded-2xl p-3.5 border transition-all cursor-pointer flex flex-col justify-between active:scale-[0.98] group overflow-hidden ${
                isAvailable 
                  ? 'border-slate-200/90 shadow-2xs hover:shadow-md hover:border-red-300' 
                  : 'border-slate-200 opacity-60 bg-slate-50'
              }`}
            >
              {!isAvailable && (
                <div className="absolute top-2.5 right-2.5 bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full z-10 shadow-xs">
                  ของหมด
                </div>
              )}
              <div>
                {/* Item Image Thumbnail if available */}
                {item.image && (
                  <div className="w-full h-24 -mx-3.5 -mt-3.5 mb-2.5 bg-slate-100 overflow-hidden flex items-center justify-center relative">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>
                )}

                {/* Header: Category Badge & Price */}
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    {getCategoryName(item.category)}
                  </span>
                  <span className="font-black text-lg text-emerald-600 tracking-tight">
                    {item.price} <span className="text-xs font-bold text-emerald-600">฿</span>
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
                  แตะเพื่อสั่ง
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
    </div>
  )
}
