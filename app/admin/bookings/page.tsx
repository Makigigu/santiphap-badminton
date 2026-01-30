'use client';

import { useState, useEffect, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';

// Types
type Booking = {
  id: string;
  customerName: string;
  phoneNumber: string;
  date: string;
  startTime: string; 
  status: string;
  price: number;
  slipUrl: string | null; // เพิ่ม slipUrl
  createdAt: string;
  court: { id: number; name: string; type: string };
};

type Court = { id: number; name: string; price: number };

// ✅ 1. แปลงรหัสสถานะเป็นภาษาไทย
const statusLabels: { [key: string]: string } = {
    all: 'ทั้งหมด',
    PENDING: 'รอชำระเงิน',
    PAID_VERIFY: '⏳ รอตรวจสอบสลิป', // แปลงตรงนี้
    APPROVED: '✅ อนุมัติ',
    REJECTED: '❌ ปฏิเสธ',
    CANCELLED: 'ยกเลิก'
};

const timeSlots = [
  "11:00-12:00", "12:00-13:00", "13:00-14:00", "14:00-15:00", 
  "15:00-16:00", "16:00-17:00", "17:00-18:00", "18:00-19:00", 
  "19:00-20:00", "20:00-21:00", "21:00-22:00"
];

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [courts, setCourts] = useState<Court[]>([]); 
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDate, setFilterDate] = useState<string>(''); 
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  
  // Image Preview Modal State
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Form State
  const [editForm, setEditForm] = useState({ 
      date: '', 
      courtId: 0, 
      status: '',
      selectedTimes: [] as string[] 
  });

  useEffect(() => {
    setFilterDate(format(new Date(), 'yyyy-MM-dd'));
    fetchData();
    fetchCourts();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/bookings', { cache: 'no-store' });
      if (res.ok) setBookings(await res.json());
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const fetchCourts = async () => {
      const res = await fetch('/api/courts');
      if (res.ok) setCourts(await res.json());
  };

  // --- Functions ---

  const handleDelete = async (id: string) => {
      if (!confirm('⚠️ คุณต้องการลบรายการนี้ถาวรหรือไม่?')) return;
      try {
          const res = await fetch('/api/bookings', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id }),
          });
          if (res.ok) {
              alert('ลบรายการเรียบร้อย');
              setEditingBooking(null);
              fetchData();
          } else { alert('ลบไม่สำเร็จ'); }
      } catch (error) { console.error(error); alert('เชื่อมต่อ Server ไม่ได้'); }
  };

  const handleDeleteAll = async () => {
      if (!confirm('🛑 คำเตือน: คุณต้องการลบ "ประวัติการจองทั้งหมด" ใช่หรือไม่?')) return;
      if (!confirm('ข้อมูลจะหายไปถาวรและกู้คืนไม่ได้ ยืนยันที่จะลบหรือไม่?')) return;
      try {
          const res = await fetch('/api/bookings', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ mode: 'ALL' }),
          });
          if (res.ok) { alert('ล้างข้อมูลทั้งหมดเรียบร้อย'); fetchData(); }
      } catch (error) { console.error(error); }
  };

  const openEditModal = (booking: Booking) => {
      setEditingBooking(booking);
      const timesArray = booking.startTime.split(',').map(t => t.trim().replace(' น.', '')).filter(t => t !== '');
      setEditForm({
          date: format(new Date(booking.date), 'yyyy-MM-dd'),
          courtId: booking.court.id,
          status: booking.status, // เก็บค่าดิบ (เช่น PAID_VERIFY)
          selectedTimes: timesArray
      });
  };

  const handleSaveEdit = async () => {
      if (!editingBooking) return;
      if (!confirm("ยืนยันการบันทึกข้อมูล?")) return;
      const combinedStartTime = editForm.selectedTimes.join(', ') + " น.";
      
      try {
          const res = await fetch('/api/bookings', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  id: editingBooking.id,
                  date: editForm.date,
                  startTime: combinedStartTime,
                  courtId: editForm.courtId,
                  status: editForm.status,
              })
          });
          if (res.ok) { alert("บันทึกสำเร็จ"); setEditingBooking(null); fetchData(); }
      } catch (error) { console.error(error); }
  };

  const toggleTimeSlot = (slot: string) => {
      setEditForm(prev => {
          const exists = prev.selectedTimes.includes(slot);
          return exists 
            ? { ...prev, selectedTimes: prev.selectedTimes.filter(t => t !== slot) }
            : { ...prev, selectedTimes: [...prev.selectedTimes, slot].sort() };
      });
  };

  // Helper: เลือกสี Badge ให้สวยงาม
  const getStatusBadge = (status: string) => {
      const s = status.toUpperCase();
      switch (s) {
          case 'PAID_VERIFY': 
              return <span className="bg-yellow-100 text-yellow-700 border border-yellow-200 px-3 py-1 rounded-full text-xs font-bold animate-pulse">⏳ รอตรวจสอบสลิป</span>;
          case 'PENDING': 
              return <span className="bg-red-100 text-red-600 border border-red-200 px-3 py-1 rounded-full text-xs font-bold">💰 รอชำระเงิน</span>;
          case 'APPROVED': 
              return <span className="bg-green-100 text-green-700 border border-green-200 px-3 py-1 rounded-full text-xs font-bold">✅ อนุมัติ</span>;
          case 'REJECTED': 
              return <span className="bg-slate-100 text-red-600 border border-red-200 px-3 py-1 rounded-full text-xs font-bold">❌ ปฏิเสธ</span>;
          default: 
              return <span className="bg-slate-100 text-slate-500 border border-slate-200 px-3 py-1 rounded-full text-xs font-bold">{status}</span>;
      }
  };

  // Logic Grouping
  const groupedBookings = useMemo(() => {
    const filtered = bookings.filter(b => {
        // แก้ไข: เทียบ Status แบบ Case-Insensitive (ตัวพิมพ์เล็ก/ใหญ่ ก็ให้เจอหมด)
        const matchesStatus = filterStatus === 'all' || b.status.toUpperCase() === filterStatus.toUpperCase();
        let matchesDate = true;
        if (filterDate) {
            matchesDate = format(new Date(b.date), 'yyyy-MM-dd') === filterDate;
        }
        return matchesStatus && matchesDate;
    });

    const groups: { [key: string]: Booking[] } = {};
    filtered.forEach(booking => {
        const dateKey = format(new Date(booking.date), 'yyyy-MM-dd');
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(booking);
    });

    return Object.keys(groups)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
        .map(date => ({ date, items: groups[date] }));
  }, [bookings, filterStatus, filterDate]);

  if (loading) return <div className="p-10 text-center text-slate-500">กำลังโหลดข้อมูล...</div>;

  return (
    <div className="space-y-6 animate-fade-in relative p-6 bg-slate-50 min-h-screen">
        
        {/* Image Modal (ดูสลิปเต็มจอ) */}
        {previewImage && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4 cursor-pointer" onClick={() => setPreviewImage(null)}>
                <img src={previewImage} alt="Slip Full" className="max-h-screen object-contain" />
            </div>
        )}

        {/* Edit Modal */}
        {editingBooking && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 animate-scale-in max-h-[95vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-4 border-b pb-2">
                        <h3 className="text-xl font-bold text-slate-800">✏️ จัดการการจอง</h3>
                        <button onClick={() => setEditingBooking(null)} className="text-slate-400 hover:text-red-500 text-2xl">×</button>
                    </div>
                    
                    <div className="space-y-5">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">ลูกค้า</label>
                                <div className="text-slate-800 font-bold text-lg">{editingBooking.customerName}</div>
                                <div className="text-slate-500 text-sm">{editingBooking.phoneNumber}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-blue-600 font-extrabold text-xl">
                                    {(courts.find(c => c.id === editForm.courtId)?.price || 0) * editForm.selectedTimes.length}.-
                                </div>
                            </div>
                        </div>

                        {/* ดูสลิปใน Modal */}
                        {editingBooking.slipUrl && (
                            <div className="text-center">
                                <label className="text-xs font-bold text-slate-500 mb-2 block">หลักฐานการโอน</label>
                                <img 
                                    src={editingBooking.slipUrl} 
                                    alt="Slip" 
                                    className="h-32 mx-auto rounded-lg border cursor-pointer hover:opacity-80 transition"
                                    onClick={() => setPreviewImage(editingBooking.slipUrl)}
                                />
                                <p className="text-[10px] text-slate-400 mt-1">(คลิกเพื่อขยาย)</p>
                            </div>
                        )}

                        <div>
                            <label className="text-sm font-bold text-slate-700 mb-1 block">เปลี่ยนสถานะ</label>
                            <select 
                                value={editForm.status}
                                onChange={e => setEditForm({...editForm, status: e.target.value})}
                                className="w-full border-2 rounded-lg p-2 font-bold bg-white text-slate-700"
                            >
                                <option value="PENDING">🔴 รอชำระเงิน (ยังไม่ส่งสลิป)</option>
                                <option value="PAID_VERIFY">🟡 รอตรวจสอบสลิป</option>
                                <option value="APPROVED">🟢 อนุมัติ (เรียบร้อย)</option>
                                <option value="REJECTED">❌ ปฏิเสธ (สลิปผิด)</option>
                                <option value="CANCELLED">⚪ ยกเลิก</option>
                            </select>
                        </div>

                        {/* เลือกเวลา (เหมือนเดิม) */}
                        <div>
                            <label className="text-sm font-bold text-slate-500 mb-2 block">เวลาจอง</label>
                            <div className="grid grid-cols-3 gap-2">
                                {timeSlots.map(slot => {
                                    const selected = editForm.selectedTimes.includes(slot);
                                    return (
                                        <button key={slot} onClick={() => toggleTimeSlot(slot)}
                                            className={`text-xs py-2 px-1 rounded-lg border font-bold transition-all ${selected ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'}`}>
                                            {slot}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 mt-8 pt-4 border-t">
                        <button onClick={() => handleDelete(editingBooking.id)} className="py-3 px-4 rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 font-bold transition flex items-center justify-center gap-2">
                            <span>🗑️</span> ลบ
                        </button>
                        <div className="flex-1"></div>
                        <button onClick={() => setEditingBooking(null)} className="py-3 px-6 rounded-xl border border-slate-200 text-slate-600 font-bold">ยกเลิก</button>
                        <button onClick={handleSaveEdit} className="py-3 px-6 rounded-xl bg-blue-600 text-white font-bold shadow-lg">บันทึก</button>
                    </div>
                </div>
            </div>
        )}

        {/* Filter Bar */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 flex flex-col xl:flex-row justify-between items-center gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
                <h2 className="text-xl font-extrabold text-slate-800 whitespace-nowrap">📅 ประวัติการจอง</h2>
                <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                    <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="bg-transparent text-sm font-bold text-slate-600 focus:outline-none cursor-pointer" />
                    {filterDate && <button onClick={() => setFilterDate('')} className="text-xs text-red-500 font-bold px-2">ดูทั้งหมด</button>}
                </div>
                <button onClick={handleDeleteAll} className="text-xs bg-red-50 text-red-600 px-3 py-2 rounded-lg font-bold border border-red-100 hover:bg-red-100 flex items-center gap-1">
                    🗑️ ล้างทั้งหมด
                </button>
            </div>

            {/* ✅ 3. ปุ่มกรองสถานะ (เพิ่มปุ่ม PAID_VERIFY) */}
            <div className="flex gap-2 flex-wrap justify-center overflow-x-auto pb-2 md:pb-0">
                {['all', 'PAID_VERIFY', 'PENDING', 'APPROVED', 'REJECTED'].map(status => (
                    <button key={status} onClick={() => setFilterStatus(status)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${filterStatus === status ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600'}`}>
                        {status === 'PAID_VERIFY' ? '⏳ รอตรวจสอบ' : statusLabels[status] || status}
                    </button>
                ))}
            </div>
        </div>

        {/* Table */}
        {groupedBookings.length > 0 ? (
            groupedBookings.map((group) => (
                <div key={group.date} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="bg-slate-100/50 px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                        <span className="text-2xl">🗓️</span>
                        <h3 className="text-lg font-bold text-slate-700">{format(parseISO(group.date), "eeeeที่ d MMMM yyyy", { locale: th })}</h3>
                        <span className="text-xs bg-white border border-slate-200 text-slate-500 px-2 py-1 rounded-full ml-auto md:ml-2">{group.items.length} รายการ</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500 text-xs uppercase hidden md:table-header-group">
                                <tr>
                                    <th className="p-4">เวลาจอง</th>
                                    <th className="p-4">ลูกค้า</th>
                                    <th className="p-4">สนาม</th>
                                    <th className="p-4">เวลาเล่น</th>
                                    <th className="p-4">ราคา</th>
                                    <th className="p-4">สถานะ</th>
                                    <th className="p-4 text-center">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {group.items.map(b => (
                                    <tr key={b.id} className="hover:bg-slate-50 transition-colors flex flex-col md:table-row p-4 md:p-0">
                                        <td className="p-2 md:p-4 text-slate-500 md:table-cell flex justify-between">
                                            <span className="md:hidden font-bold">เวลาทำรายการ:</span>
                                            {format(new Date(b.createdAt), "HH:mm", { locale: th })} น.
                                        </td>
                                        <td className="p-2 md:p-4 md:table-cell flex justify-between">
                                            <span className="md:hidden font-bold">ลูกค้า:</span>
                                            <div><div className="font-bold text-slate-800">{b.customerName}</div><div className="text-xs text-slate-400">{b.phoneNumber}</div></div>
                                        </td>
                                        <td className="p-2 md:p-4 md:table-cell flex justify-between">
                                            <span className="md:hidden font-bold">สนาม:</span>
                                            <span className="font-bold text-blue-600">{b.court.name.replace('COURT', 'สนาม')}</span>
                                        </td>
                                        <td className="p-2 md:p-4 md:table-cell flex justify-between">
                                            <span className="md:hidden font-bold">เวลาเล่น:</span>
                                            <span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold text-slate-600">{b.startTime}</span>
                                        </td>
                                        <td className="p-2 md:p-4 font-bold text-slate-800 md:table-cell flex justify-between">
                                            <span className="md:hidden font-bold">ราคา:</span> {b.price.toLocaleString()}.-
                                        </td>
                                        <td className="p-2 md:p-4 md:table-cell flex justify-between">
                                            <span className="md:hidden font-bold">สถานะ:</span>
                                            {getStatusBadge(b.status)}
                                        </td>
                                        <td className="p-2 md:p-4 text-center md:table-cell flex justify-end">
                                            <button onClick={() => openEditModal(b)} className="bg-slate-100 hover:bg-blue-50 text-slate-400 hover:text-blue-600 p-2 rounded-lg transition">✏️</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))
        ) : (
            <div className="bg-white rounded-3xl p-16 text-center border border-slate-200">
                <p className="text-4xl mb-4">🔍</p>
                <p className="text-slate-400 font-bold">ไม่พบประวัติการจอง</p>
            </div>
        )}
    </div>
  );
}