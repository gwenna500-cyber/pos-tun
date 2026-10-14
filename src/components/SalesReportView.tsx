import React, { useState, useEffect } from 'react'
import { 
  BarChart3, 
  ShoppingBag, 
  Printer, 
  Download, 
  RotateCcw, 
  Calendar, 
  CheckCircle2,
  Award,
  Edit3,
  Trash2
} from 'lucide-react'
import { getTodayOrders } from '../lib/db'
import { usePosStore } from '../store/usePosStore'
import { SPICY_LEVELS } from '../lib/constants'
import type { Order } from '../types'
import { EditOrderModal } from './EditOrderModal'

export const SalesReportView: React.FC = () => {
  const { openReceiptModal, spicyOptions, deleteExistingOrder } = usePosStore()
  const [orders, setOrders] = useState<Order[]>([])
  const [editingOrder, setEditingOrder] = useState<Order | null>(null)

  const loadData = async () => {
    try {
      const data = await getTodayOrders()
      setOrders(data)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Calculate statistics
  const totalRevenue = orders.reduce((sum, o) => sum + o.grandTotal, 0)
  const totalItemsSold = orders.reduce((sum, o) => sum + o.totalItemsCount, 0)
  const totalOrders = orders.length

  // Top Selling Items Breakdown
  const itemMap: Record<string, { name: string; count: number; total: number }> = {}
  orders.forEach(order => {
    order.items.forEach(item => {
      if (!itemMap[item.name]) {
        itemMap[item.name] = { name: item.name, count: 0, total: 0 }
      }
      itemMap[item.name].count += item.quantity
      itemMap[item.name].total += item.price * item.quantity
    })
  })
  const topSellingItems = Object.values(itemMap).sort((a, b) => b.count - a.count)

  // Payment Breakdown
  const paymentBreakdown = {
    promptpay: orders.filter(o => o.paymentMethod === 'promptpay').reduce((s, o) => s + o.grandTotal, 0),
    cash: orders.filter(o => o.paymentMethod === 'cash').reduce((s, o) => s + o.grandTotal, 0),
    transfer: orders.filter(o => o.paymentMethod === 'transfer').reduce((s, o) => s + o.grandTotal, 0)
  }

  // Export CSV
  const handleExportCsv = () => {
    if (orders.length === 0) return
    let csv = 'คิว,เวลา,รายการ,จำนวนรายการ,วิธีปรุง,ระดับเผ็ด,วิธีชำระ,ยอดสุทธิ (บาท)\n'
    orders.forEach(o => {
      const timeStr = new Date(o.createdAt).toLocaleTimeString('th-TH')
      const itemsStr = o.items.map(i => `${i.name}x${i.quantity}`).join(' | ')
      csv += `"${o.orderNumber}","${timeStr}","${itemsStr}",${o.totalItemsCount},"${o.cookingMethod}","${o.spicyLevel}","${o.paymentMethod}",${o.grandTotal}\n`
    })

    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `sales-report-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const todayThai = new Date().toLocaleDateString('th-TH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-5 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-red-600" />
            <span>สรุปยอดขายประจำวัน (ร้านหม่าล่าทอด)</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>{todayThai}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            title="รีเฟรชข้อมูล"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={handleExportCsv}
            disabled={orders.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors shadow-xs disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>ส่งออก CSV (Excel)</span>
          </button>
        </div>
      </div>

      {/* 3 Main Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              ยอดขายรวมวันนี้
            </span>
            <div className="text-3xl font-black text-red-600 mt-1">
              {totalRevenue.toLocaleString()} <span className="text-base font-bold text-slate-700">฿</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">คำนวณจากทุกออเดอร์ที่บันทึก</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center font-black">
            ฿
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              จำนวนรายการที่ขายได้
            </span>
            <div className="text-3xl font-black text-slate-900 mt-1">
              {totalItemsSold.toLocaleString()} <span className="text-base font-bold text-slate-700">ชิ้น/รายการ</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">รวมทุกเมนูหม่าล่าทอด</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <ShoppingBag className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              จำนวนบิลทั้งหมด
            </span>
            <div className="text-3xl font-black text-slate-900 mt-1">
              {totalOrders} <span className="text-base font-bold text-slate-700">บิล</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              เฉลี่ย {totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0} ฿/บิล
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Top Selling Items & Payment Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Top Selling Menu Items */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="font-black text-slate-900 text-base flex items-center gap-1.5">
              <Award className="w-5 h-5 text-amber-500" />
              <span>อันดับเมนูขายดีประจำวัน (Top Selling Items)</span>
            </h3>
            <span className="text-xs text-slate-400 font-medium">เรียงตามจำนวนที่ขายได้</span>
          </div>

          {topSellingItems.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              ยังไม่มีข้อมูลการขายในวันนี้
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {topSellingItems.slice(0, 8).map((item, idx) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/80 hover:bg-slate-100/70 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                      idx === 0 ? 'bg-amber-400 text-slate-950 shadow-xs' :
                      idx === 1 ? 'bg-slate-300 text-slate-800' :
                      idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="font-bold text-slate-800 text-sm">{item.name}</span>
                  </div>

                  <div className="text-right">
                    <span className="font-black text-slate-900 text-sm">{item.count}</span>
                    <span className="text-xs text-slate-500 ml-1">ชิ้น</span>
                    <span className="text-xs text-slate-400 ml-2">({item.total.toLocaleString()} ฿)</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payment Methods */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <h3 className="font-black text-slate-900 text-base mb-3">
            สัดส่วนการชำระเงิน
          </h3>
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-blue-900">พร้อมเพย์ QR</span>
                <div className="text-lg font-black text-blue-700">{paymentBreakdown.promptpay.toLocaleString()} ฿</div>
              </div>
              <span className="text-xs font-bold text-blue-800">
                {totalRevenue > 0 ? Math.round((paymentBreakdown.promptpay / totalRevenue) * 100) : 0}%
              </span>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-900">เงินสด</span>
                <div className="text-lg font-black text-emerald-700">{paymentBreakdown.cash.toLocaleString()} ฿</div>
              </div>
              <span className="text-xs font-bold text-emerald-800">
                {totalRevenue > 0 ? Math.round((paymentBreakdown.cash / totalRevenue) * 100) : 0}%
              </span>
            </div>

            <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-purple-900">โอนเงิน</span>
                <div className="text-lg font-black text-purple-700">{paymentBreakdown.transfer.toLocaleString()} ฿</div>
              </div>
              <span className="text-xs font-bold text-purple-800">
                {totalRevenue > 0 ? Math.round((paymentBreakdown.transfer / totalRevenue) * 100) : 0}%
              </span>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 text-center">
            * สรุปอัปเดตอัตโนมัติทุกครั้งที่มีการบันทึกบิล
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-black text-slate-900 text-base">
            ประวัติการขายวันนี้ ({orders.length} รายการ)
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="py-3 px-4">คิว / โต๊ะ</th>
                <th className="py-3 px-4">เวลา</th>
                <th className="py-3 px-4">รายการอาหาร</th>
                <th className="py-3 px-4">ระดับความเผ็ด & ตัวเลือกพิเศษ</th>
                <th className="py-3 px-4">ยอดสุทธิ</th>
                <th className="py-3 px-4">ชำระโดย</th>
                <th className="py-3 px-4 text-center">จัดการ / พิมพ์</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-black text-slate-900 text-sm">
                    {o.orderNumber}
                    <span className="block text-[10px] font-medium text-slate-500">[{o.tableOrQueue}]</span>
                  </td>
                  <td className="py-3 px-4 text-slate-500">
                    {new Date(o.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-800">{o.totalItemsCount} รายการ</span>
                    <span className="block text-[10px] text-slate-400 truncate max-w-xs">
                      {o.items.map(i => `${i.name}x${i.quantity}`).join(', ')}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {o.spicyLevel ? (
                      <span className="font-bold text-red-600 block text-xs">
                        🔥 {spicyOptions.find(s => s.id === o.spicyLevel)?.label || SPICY_LEVELS.find(s => s.id === o.spicyLevel)?.label || o.spicyLevel}
                      </span>
                    ) : (
                      <span className="text-slate-400 font-medium block text-xs">-</span>
                    )}
                    {o.orderAddons && o.orderAddons.length > 0 && (
                      <span className="inline-block mt-0.5 text-[10px] text-amber-800 font-semibold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                        ✨ {o.orderAddons.join(', ')}
                      </span>
                    )}
                    {o.notes && (
                      <span className="block text-[10px] text-slate-500 italic truncate max-w-[150px] mt-0.5">
                        โน้ต: {o.notes}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-black text-slate-900 text-sm">
                    {o.grandTotal} ฿
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                      {o.paymentMethod === 'promptpay' ? 'พร้อมเพย์' : o.paymentMethod === 'cash' ? 'เงินสด' : 'โอน'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setEditingOrder(o)}
                        className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 transition-colors cursor-pointer"
                        title="แก้ไขบิล / ปรับราคา / แก้เมนู"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openReceiptModal(o)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                        title="ดูและพิมพ์ใบเสร็จ"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      <button
                        onClick={async () => {
                          if (window.confirm(`ยืนยันการลบบิล ${o.orderNumber} หรือไม่?\nยอดเงิน ${o.grandTotal} บาทจะถูกหักออกจากรายงานการขายและสถานะโต๊ะ`)) {
                            await deleteExistingOrder(o.id)
                            await loadData()
                          }
                        }}
                        className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors cursor-pointer"
                        title="ลบบิลนี้"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Order Modal */}
      <EditOrderModal
        order={editingOrder}
        isOpen={!!editingOrder}
        onClose={() => setEditingOrder(null)}
        onSaveSuccess={() => {
          setEditingOrder(null)
          loadData()
        }}
        onDeleteSuccess={() => {
          setEditingOrder(null)
          loadData()
        }}
      />
    </div>
  )
}
