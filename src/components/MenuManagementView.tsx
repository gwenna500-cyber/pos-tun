import React, { useState, useMemo } from 'react'
import { 
  UtensilsCrossed, 
  Flame, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  RotateCcw, 
  ToggleLeft,
  ToggleRight,
  Eye,
  AlertTriangle
} from 'lucide-react'
import { usePosStore } from '../store/usePosStore'
import { MENU_CATEGORIES } from '../lib/constants'
import type { MenuItem, SpicyOption } from '../types'

// Color theme presets for spicy/modifier badges
const BADGE_COLOR_PRESETS = [
  { id: 'red', name: 'แดงเข้ม (เผ็ดจัด/เผ็ดชา)', class: 'bg-red-600 text-white border-red-700' },
  { id: 'orange', name: 'ส้มสด (เผ็ดกลาง/สูตรเด็ด)', class: 'bg-orange-100 text-orange-800 border-orange-400' },
  { id: 'amber', name: 'ส้มอำพัน (เผ็ดน้อย)', class: 'bg-amber-100 text-amber-800 border-amber-300' },
  { id: 'slate', name: 'เทาอ่อน (ไม่เผ็ด/ผงหวาน)', class: 'bg-slate-100 text-slate-700 border-slate-300' },
  { id: 'purple', name: 'ม่วง (พริกแยก/ใส่ถ้วย)', class: 'bg-purple-100 text-purple-800 border-purple-300' },
  { id: 'yellow', name: 'เหลือง (สูตรพิเศษ/ชีส)', class: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { id: 'stone', name: 'หิน/น้ำตาล (พริกคั่วโบราณ)', class: 'bg-stone-100 text-stone-800 border-stone-300' },
  { id: 'emerald', name: 'เขียวมรกต (สมุนไพร/พิเศษ)', class: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { id: 'sky', name: 'ฟ้าสดใส (ซอสสูตรลับ)', class: 'bg-sky-100 text-sky-800 border-sky-300' },
]

export const MenuManagementView: React.FC = () => {
  const { 
    menuItems, 
    spicyOptions,
    addMenuItemRecord,
    updateMenuItemRecord,
    deleteMenuItemRecord,
    toggleMenuItemAvailability,
    addSpicyOptionRecord,
    updateSpicyOptionRecord,
    deleteSpicyOptionRecord,
    toggleSpicyOptionAvailability,
    resetMenuDefaults,
    resetSpicyDefaults
  } = usePosStore()

  // Main Sub-Tab: 'items' (เมนูอาหาร) vs 'spicy' (ระดับความเผ็ด)
  const [activeTab, setActiveTab] = useState<'items' | 'spicy'>('items')

  // Menu Search & Category Filter
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  // Menu Item Modal State
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [menuForm, setMenuForm] = useState({
    name: '',
    price: 20,
    category: 'meat_pork',
    description: '',
    isAvailable: true
  })

  // Spicy Option Modal State
  const [isSpicyModalOpen, setIsSpicyModalOpen] = useState(false)
  const [editingSpicy, setEditingSpicy] = useState<SpicyOption | null>(null)
  const [spicyForm, setSpicyForm] = useState({
    label: '',
    desc: '',
    badgeClass: 'bg-red-600 text-white border-red-700',
    isAvailable: true
  })

  // Confirmation Delete Modals
  const [itemToDelete, setItemToDelete] = useState<MenuItem | null>(null)
  const [spicyToDelete, setSpicyToDelete] = useState<SpicyOption | null>(null)

  // Filtered menu items
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchCat = selectedCategory === 'all' || item.category === selectedCategory
      const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
      return matchCat && matchSearch
    })
  }, [menuItems, selectedCategory, searchQuery])

  // --- Handlers for Menu Items ---
  const handleOpenAddMenuModal = () => {
    setEditingItem(null)
    setMenuForm({
      name: '',
      price: 20,
      category: 'meat_pork',
      description: '',
      isAvailable: true
    })
    setIsMenuModalOpen(true)
  }

  const handleOpenEditMenuModal = (item: MenuItem) => {
    setEditingItem(item)
    setMenuForm({
      name: item.name,
      price: item.price,
      category: item.category,
      description: item.description || '',
      isAvailable: item.isAvailable
    })
    setIsMenuModalOpen(true)
  }

  const handleSaveMenu = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!menuForm.name.trim()) {
      alert('กรุณากรอกชื่อเมนูอาหาร')
      return
    }

    if (editingItem) {
      await updateMenuItemRecord(editingItem.id, {
        name: menuForm.name.trim(),
        price: Number(menuForm.price) || 0,
        category: menuForm.category,
        description: menuForm.description.trim(),
        isAvailable: menuForm.isAvailable
      })
    } else {
      await addMenuItemRecord({
        name: menuForm.name.trim(),
        price: Number(menuForm.price) || 0,
        category: menuForm.category,
        description: menuForm.description.trim(),
        isAvailable: menuForm.isAvailable
      })
    }

    setIsMenuModalOpen(false)
  }

  const handleConfirmDeleteItem = async () => {
    if (!itemToDelete) return
    await deleteMenuItemRecord(itemToDelete.id)
    setItemToDelete(null)
  }

  // --- Handlers for Spicy Options ---
  const handleOpenAddSpicyModal = () => {
    setEditingSpicy(null)
    setSpicyForm({
      label: '',
      desc: '',
      badgeClass: 'bg-red-600 text-white border-red-700',
      isAvailable: true
    })
    setIsSpicyModalOpen(true)
  }

  const handleOpenEditSpicyModal = (option: SpicyOption) => {
    setEditingSpicy(option)
    setSpicyForm({
      label: option.label,
      desc: option.desc || '',
      badgeClass: option.badgeClass || 'bg-red-600 text-white border-red-700',
      isAvailable: option.isAvailable !== false
    })
    setIsSpicyModalOpen(true)
  }

  const handleSaveSpicy = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!spicyForm.label.trim()) {
      alert('กรุณากรอกชื่อระดับความเผ็ด / รสชาติ')
      return
    }

    if (editingSpicy) {
      await updateSpicyOptionRecord(editingSpicy.id, {
        label: spicyForm.label.trim(),
        desc: spicyForm.desc.trim(),
        badgeClass: spicyForm.badgeClass,
        isAvailable: spicyForm.isAvailable
      })
    } else {
      await addSpicyOptionRecord({
        label: spicyForm.label.trim(),
        desc: spicyForm.desc.trim(),
        badgeClass: spicyForm.badgeClass,
        isAvailable: spicyForm.isAvailable
      })
    }

    setIsSpicyModalOpen(false)
  }

  const handleConfirmDeleteSpicy = async () => {
    if (!spicyToDelete) return
    await deleteSpicyOptionRecord(spicyToDelete.id)
    setSpicyToDelete(null)
  }

  // Reset defaults with prompt
  const handleResetMenu = () => {
    if (confirm('ต้องการรีเซ็ตรายการเมนูทั้งหมดกลับเป็นค่าเริ่มต้นของร้านหม่าล่าทอดหรือไม่? (ข้อมูลที่เพิ่มใหม่จะถูกรีเซ็ต)')) {
      resetMenuDefaults()
    }
  }

  const handleResetSpicy = () => {
    if (confirm('ต้องการรีเซ็ตระดับความเผ็ดทั้งหมดกลับเป็นค่าเริ่มต้นหรือไม่?')) {
      resetSpicyDefaults()
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-5 pb-20">
      {/* Top Header & Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <UtensilsCrossed className="w-6 h-6 text-red-600" />
            <span>จัดการเมนู & ระดับความเผ็ด</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            เพิ่ม ลบ แก้ไข เมนูอาหาร และกำหนดตัวเลือกระดับความเผ็ดชาสำหรับลูกค้า
          </p>
        </div>

        {/* Sub-tab pills */}
        <div className="flex items-center bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('items')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'items'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>เมนูอาหาร ({menuItems.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('spicy')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'spicy'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>ระดับความเผ็ด ({spicyOptions.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: MENU ITEMS MANAGEMENT */}
      {/* ========================================================================= */}
      {activeTab === 'items' && (
        <div className="space-y-4">
          {/* Action Bar (Search + Category Filter + Add Button) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาชื่อเมนู หรือรายละเอียด..."
                  className="w-full h-10 pl-10 pr-4 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                  >
                    ล้าง
                  </button>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleResetMenu}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="รีเซ็ตเป็นเมนูหม่าล่าทอดเริ่มต้น"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">รีเซ็ตเมนูเริ่มต้น</span>
                </button>

                <button
                  onClick={handleOpenAddMenuModal}
                  className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-red-200 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>เพิ่มเมนูอาหารใหม่</span>
                </button>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-1 border-t border-slate-100">
              {MENU_CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat.id
                const count = cat.id === 'all' 
                  ? menuItems.length 
                  : menuItems.filter(i => i.category === cat.id).length

                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>{cat.name}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      isActive ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Menu Items Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {filteredMenuItems.map((item) => {
              const isAvailable = item.isAvailable !== false
              const catName = MENU_CATEGORIES.find(c => c.id === item.category)?.name || 'ทั่วไป'

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl p-4 border transition-all flex flex-col justify-between shadow-xs hover:shadow-md ${
                    isAvailable ? 'border-slate-200' : 'border-slate-200 opacity-60 bg-slate-50/70'
                  }`}
                >
                  <div>
                    {/* Category & Status Badge */}
                    <div className="flex items-center justify-between gap-1 mb-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {catName}
                      </span>
                      <button
                        onClick={() => toggleMenuItemAvailability(item.id)}
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full transition-colors cursor-pointer flex items-center gap-1 ${
                          isAvailable
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                        }`}
                        title="คลิกเพื่อสลับสถานะ พร้อมขาย / ของหมด"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                        <span>{isAvailable ? 'พร้อมขาย' : 'ของหมด'}</span>
                      </button>
                    </div>

                    {/* Name & Price */}
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">
                        {item.name}
                      </h3>
                      <div className="font-black text-emerald-600 text-base flex-shrink-0 tracking-tight">
                        {item.price} <span className="text-xs font-bold text-emerald-600">฿</span>
                      </div>
                    </div>

                    {/* Description */}
                    {item.description && (
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>

                  {/* Card Footer Actions */}
                  <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => toggleMenuItemAvailability(item.id)}
                      className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium cursor-pointer"
                    >
                      {isAvailable ? (
                        <>
                          <ToggleRight className="w-5 h-5 text-emerald-600" />
                          <span className="text-[11px]">เปิดขาย</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-5 h-5 text-slate-400" />
                          <span className="text-[11px] text-rose-600 font-bold">ของหมด</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditMenuModal(item)}
                        className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                        title="แก้ไขเมนู"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setItemToDelete(item)}
                        className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                        title="ลบเมนู"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {filteredMenuItems.length === 0 && (
            <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-300">
              <p className="text-slate-500 text-sm font-semibold">ไม่พบเมนูอาหาร</p>
              <button
                onClick={handleOpenAddMenuModal}
                className="mt-3 px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>เพิ่มเมนูอาหารชิ้นแรก</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SPICY / MODIFIER OPTIONS MANAGEMENT */}
      {/* ========================================================================= */}
      {activeTab === 'spicy' && (
        <div className="space-y-4">
          {/* Action Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                ตัวเลือกระดับความเผ็ดและผงปรุงรสทั้งหมด ({spicyOptions.length} ตัวเลือก)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                ตัวเลือกเหล่านี้จะแสดงในหน้าต่างเลือกความเผ็ด เมื่อลูกค้าแตะเลือกเมนูอาหาร
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleResetSpicy}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="รีเซ็ตเป็นตัวเลือกความเผ็ดเริ่มต้น"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">รีเซ็ตค่าเริ่มต้น</span>
              </button>

              <button
                onClick={handleOpenAddSpicyModal}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-red-200 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>เพิ่มตัวเลือกความเผ็ดใหม่</span>
              </button>
            </div>
          </div>

          {/* Spicy Options List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {spicyOptions.map((opt) => {
              const isAvailable = opt.isAvailable !== false
              return (
                <div
                  key={opt.id}
                  className={`bg-white rounded-2xl p-4 border transition-all flex flex-col justify-between shadow-xs ${
                    isAvailable ? 'border-slate-200' : 'border-slate-200 opacity-60 bg-slate-50/70'
                  }`}
                >
                  <div>
                    {/* Header: Label + Live Badge Preview */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${opt.badgeClass || 'bg-red-600 text-white border-red-700'}`}>
                        {opt.label.split(' ')[0]}
                      </span>
                      <button
                        onClick={() => toggleSpicyOptionAvailability(opt.id)}
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full transition-colors cursor-pointer flex items-center gap-1 ${
                          isAvailable
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? 'bg-emerald-600' : 'bg-slate-500'}`} />
                        <span>{isAvailable ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}</span>
                      </button>
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm">
                      {opt.label}
                    </h3>

                    {opt.desc && (
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        {opt.desc}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => toggleSpicyOptionAvailability(opt.id)}
                      className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium cursor-pointer"
                    >
                      {isAvailable ? (
                        <>
                          <ToggleRight className="w-5 h-5 text-emerald-600" />
                          <span className="text-[11px]">เปิดให้เลือก</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-5 h-5 text-slate-400" />
                          <span className="text-[11px] text-slate-500">ซ่อนจากหน้าจอ</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditSpicyModal(opt)}
                        className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                        title="แก้ไขตัวเลือก"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setSpicyToDelete(opt)}
                        className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                        title="ลบตัวเลือก"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT MENU ITEM */}
      {/* ========================================================================= */}
      {isMenuModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5 text-red-600" />
                <h3 className="font-black text-slate-900 text-base">
                  {editingItem ? 'แก้ไขเมนูอาหาร' : 'เพิ่มเมนูอาหารใหม่'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMenuModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveMenu} className="p-4 space-y-3.5 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อเมนูอาหาร <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={menuForm.name}
                  onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })}
                  placeholder="เช่น สันคอหมูหมักหม่าล่าทอด, ไก่ป๊อปหม่าล่า..."
                  className="w-full h-10 px-3 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ราคา (บาท) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={menuForm.price}
                    onChange={(e) => setMenuForm({ ...menuForm, price: Number(e.target.value) })}
                    className="w-full h-10 px-3 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">หมวดหมู่</label>
                  <select
                    value={menuForm.category}
                    onChange={(e) => setMenuForm({ ...menuForm, category: e.target.value })}
                    className="w-full h-10 px-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500"
                  >
                    {MENU_CATEGORIES.filter(c => c.id !== 'all').map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  คำอธิบาย / จุดเด่นของเมนู (ถ้ามี)
                </label>
                <textarea
                  rows={2}
                  value={menuForm.description}
                  onChange={(e) => setMenuForm({ ...menuForm, description: e.target.value })}
                  placeholder="เช่น ทอดกรอบสะเด็ดน้ำมัน หอมเครื่องเทศจีนแท้..."
                  className="w-full p-2.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* In stock toggle */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800">สถานะพร้อมขาย</div>
                  <div className="text-[11px] text-slate-500">หากปิด เมนูนี้จะขึ้นว่าของหมดในหน้าแคชเชียร์</div>
                </div>
                <input
                  type="checkbox"
                  checked={menuForm.isAvailable}
                  onChange={(e) => setMenuForm({ ...menuForm, isAvailable: e.target.checked })}
                  className="w-5 h-5 accent-red-600 cursor-pointer"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsMenuModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-200 transition-all flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>บันทึกเมนู</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT SPICY OPTION */}
      {/* ========================================================================= */}
      {isSpicyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-red-600" />
                <h3 className="font-black text-slate-900 text-base">
                  {editingSpicy ? 'แก้ไขระดับความเผ็ด / รสชาติ' : 'เพิ่มระดับความเผ็ดใหม่'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSpicyModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveSpicy} className="p-4 space-y-3.5 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อตัวเลือกความเผ็ด / ผงปรุง <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={spicyForm.label}
                  onChange={(e) => setSpicyForm({ ...spicyForm, label: e.target.value })}
                  placeholder="เช่น เผ็ดสะดุ้ง (X3), คลุกผงต้มยำ, คลุกผงชีส..."
                  className="w-full h-10 px-3 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  คำอธิบายสั้น ๆ
                </label>
                <input
                  type="text"
                  value={spicyForm.desc}
                  onChange={(e) => setSpicyForm({ ...spicyForm, desc: e.target.value })}
                  placeholder="เช่น พริกหม่าล่าสูตรเผ็ดพิเศษ, หอมกลิ่นชีสเข้มข้น..."
                  className="w-full h-10 px-3 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* Color Preset Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  เลือกโทนสีป้ายกำกับ (Badge Color)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {BADGE_COLOR_PRESETS.map((preset) => {
                    const isSelected = spicyForm.badgeClass === preset.class
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setSpicyForm({ ...spicyForm, badgeClass: preset.class })}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                          isSelected ? 'ring-2 ring-red-500 border-red-500 shadow-xs' : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${preset.class}`}>
                          ตัวอย่าง
                        </span>
                        <span className="text-[9px] text-slate-500 line-clamp-1">{preset.name.split(' ')[0]}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Live Preview */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  <span>ตัวอย่างเมื่อแสดงในหน้าจอขาย / จอครัว:</span>
                </span>
                <div className="flex items-center gap-2 pt-1">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${spicyForm.badgeClass}`}>
                    [{spicyForm.label ? spicyForm.label.split(' ')[0] : 'ชื่อตัวเลือก'}]
                  </span>
                  <span className="text-xs text-slate-600 font-semibold">{spicyForm.desc || 'คำอธิบายรสชาติ'}</span>
                </div>
              </div>

              {/* Enabled toggle */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800">เปิดใช้งานตัวเลือกนี้</div>
                  <div className="text-[11px] text-slate-500">หากปิด ตัวเลือกนี้จะไม่แสดงในหน้าจอขาย</div>
                </div>
                <input
                  type="checkbox"
                  checked={spicyForm.isAvailable}
                  onChange={(e) => setSpicyForm({ ...spicyForm, isAvailable: e.target.checked })}
                  className="w-5 h-5 accent-red-600 cursor-pointer"
                />
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSpicyModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-200 transition-all flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>บันทึกตัวเลือก</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE MENU ITEM CONFIRM MODAL */}
      {/* ========================================================================= */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 text-center space-y-3 shadow-2xl border border-slate-200 animate-scale-up">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-black text-slate-900 text-base">ยืนยันการลบเมนู?</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              คุณต้องการลบเมนู <strong className="text-slate-800">"{itemToDelete.name}"</strong> ใช่หรือไม่? เมนูนี้จะถูกลบออกจากหน้าจอแคชเชียร์
            </p>
            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={() => setItemToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmDeleteItem}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm"
              >
                ลบเมนูนี้
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE SPICY OPTION CONFIRM MODAL */}
      {/* ========================================================================= */}
      {spicyToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 text-center space-y-3 shadow-2xl border border-slate-200 animate-scale-up">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-black text-slate-900 text-base">ยืนยันการลบระดับความเผ็ด?</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              คุณต้องการลบตัวเลือก <strong className="text-slate-800">"{spicyToDelete.label}"</strong> ใช่หรือไม่?
            </p>
            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={() => setSpicyToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmDeleteSpicy}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm"
              >
                ลบตัวเลือกนี้
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
