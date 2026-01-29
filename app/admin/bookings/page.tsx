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
  startTime: string; // เก็บเป็น string ยาวๆ เช่น "18:00-19:00, 19:00-20:00"
  status: string;
  price: number;
  createdAt: string;
  court: { id: number; name: string; type: string };
};

type Court = { id: number; name: string; price: number }; // เพิ่ม price

const statusLabels: { [key: string]: string } = {
    all: 'ทั้งหมด',
    pending: 'รอตรวจสอบ',
    approved: 'อนุมัติ (จองสำเร็จ)',
    rejected: 'ปฏิเสธ (สลิปผิด)',
    cancelled: 'ยกเลิก (ไม่คืนเงิน)'
};

// รายการเวลามาตรฐาน
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

  // State สำหรับ Modal แก้ไข
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  
  // Form State
  const [editForm, setEditForm] = useState({ 
      date: '', 
      courtId: 0, 
      status: '',
      selectedTimes: [] as string[] // เก็บเวลาเป็น Array เพื่อให้เลือกหลายอันได้ง่าย
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

  // เปิด Modal แก้ไข
  const openEditModal = (booking: Booking) => {
      setEditingBooking(booking);
      
      // แปลง string เวลา "18:00-19:00, 19:00-20:00" -> Array ["18:00-19:00", "19:00-20:00"]
      // (ตัดคำว่า 'น.' ออกเพื่อให้เทียบง่าย)
      const timesArray = booking.startTime.split(',')
          .map(t => t.trim().replace(' น.', ''))
          .filter(t => t !== '');

      setEditForm({
          date: format(new Date(booking.date), 'yyyy-MM-dd'),
          courtId: booking.court.id,
          status: booking.status,
          selectedTimes: timesArray
      });
  };

  // จัดการการกดเลือกเวลา (Toggle)
  const toggleTimeSlot = (slot: string) => {
      setEditForm(prev => {
          const exists = prev.selectedTimes.includes(slot);
          if (exists) {
              return { ...prev, selectedTimes: prev.selectedTimes.filter(t => t !== slot) };
          } else {
              return { ...prev, selectedTimes: [...prev.selectedTimes, slot].sort() }; // sort เวลาให้เรียงสวยๆ
          }
      });
  };

  // ฟังก์ชันเช็คว่าสล็อตนี้ "ไม่ว่าง" หรือไม่ (โดยไม่นับรายการที่เรากำลังแก้อยู่)
  const isSlotOccupied = (slot: string) => {
      if (!editingBooking) return false;

      // หา Booking อื่นๆ ที่ไม่ใช่ตัวนี้ ในวันเดียวกัน และสนามเดียวกัน
      const conflicting = bookings.find(b => 
          b.id !== editingBooking.id && // ไม่ใช่ตัวเอง
          format(new Date(b.date), 'yyyy-MM-dd') === editForm.date && // วันเดียวกัน
          b.court.id === editForm.courtId && // สนามเดียวกัน
          b.status !== 'rejected' && // ไม่ใช่รายการที่ปฏิเสธ
          b.status !== 'cancelled' && // ไม่ใช่รายการที่ยกเลิก
          b.startTime.includes(slot) // เวลานี้ถูกใช้ไปหรือยัง
      );

      return !!conflicting;
  };

  // บันทึกการแก้ไข
  const handleSaveEdit = async () => {
      if (!editingBooking) return;
      if (editForm.selectedTimes.length === 0) return alert("กรุณาเลือกเวลาอย่างน้อย 1 ช่วง");
      if (!confirm("ยืนยันการแก้ไขข้อมูล?")) return;

      // คำนวณราคาใหม่ (จำนวนชั่วโมง x ราคาต่อชั่วโมง)
      const selectedCourt = courts.find(c => c.id === editForm.courtId);
      const hourCount = editForm.selectedTimes.length;
      const newPrice = selectedCourt ? selectedCourt.price * hourCount : editingBooking.price;

      // รวมเวลาเป็น string กลับคืน (เติม น. ท้ายสุด)
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
                  // ส่งราคาใหม่ไปด้วย (ถ้า API รองรับแก้ราคา ให้แก้ API เพิ่มนิดหน่อย หรือปล่อยไว้ถ้าระบบล็อคราคา)
                  // แต่ในโค้ด API เดิมไม่ได้แก้ราคา ดังนั้นราคามันจะไม่อัปเดตตามเวลาที่เปลี่ยน
                  // *หมายเหตุ: ถ้าอยากให้ราคาเปลี่ยนตามเวลา ต้องไปแก้ API PATCH ให้รับ price ด้วย*
              })
          });

          if (res.ok) {
              alert("บันทึกข้อมูลเรียบร้อย");
              setEditingBooking(null); 
              fetchData(); 
          } else {
              alert("เกิดข้อผิดพลาด หรือช่วงเวลานี้ถูกแย่งจองไปแล้ว");
          }
      } catch (error) {
          console.error(error);
          alert("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้");
      }
  };

  // --- Logic Grouping ---
  const groupedBookings = useMemo(() => {
    const filtered = bookings.filter(b => {
        const matchesStatus = filterStatus === 'all' || b.status === filterStatus;
        let matchesDate = true;
        if (filterDate) {
            const bookingDateStr = format(new Date(b.date), 'yyyy-MM-dd');
            matchesDate = bookingDateStr === filterDate;
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
    <div className="space-y-6 animate-fade-in relative">
        
        {/* --- Modal แก้ไขข้อมูล --- */}
        {editingBooking && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 animate-scale-in max-h-[95vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-4 border-b pb-2">
                        <h3 className="text-xl font-bold text-slate-800">✏️ จัดการการจอง</h3>
                        <button onClick={() => setEditingBooking(null)} className="text-slate-400 hover:text-red-500 text-2xl">×</button>
                    </div>
                    
                    <div className="space-y-5">
                        {/* Info ลูกค้า */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">ลูกค้า</label>
                                <div className="text-slate-800 font-bold text-lg">{editingBooking.customerName}</div>
                                <div className="text-slate-500 text-sm">{editingBooking.phoneNumber}</div>
                            </div>
                            <div className="text-right">
                                <label className="text-xs font-bold text-slate-500 uppercase">ราคารวม</label>
                                {/* คำนวณราคา Realtime โชว์ให้ดู */}
                                <div className="text-blue-600 font-extrabold text-xl">
                                    {(courts.find(c => c.id === editForm.courtId)?.price || 0) * editForm.selectedTimes.length}.-
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-bold text-slate-700 mb-1 block">สถานะ</label>
                            <select 
                                value={editForm.status}
                                onChange={e => setEditForm({...editForm, status: e.target.value})}
                                className={`w-full border-2 rounded-lg p-2 font-bold ${
                                    editForm.status === 'approved' ? 'border-green-200 bg-green-50 text-green-700' :
                                    editForm.status === 'rejected' ? 'border-red-200 bg-red-50 text-red-700' :
                                    editForm.status === 'cancelled' ? 'border-slate-300 bg-slate-100 text-slate-600' :
                                    'border-orange-200 bg-orange-50 text-orange-700'
                                }`}
                            >
                                <option value="pending">รอตรวจสอบ</option>
                                <option value="approved">อนุมัติ (Active)</option>
                                <option value="rejected">ปฏิเสธ (สลิปใช้ไม่ได้)</option>
                                <option value="cancelled">ยกเลิก (ไม่คืนเงิน)</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-bold text-slate-500 mb-1 block">วันที่</label>
                                <input 
                                    type="date" 
                                    value={editForm.date}
                                    onChange={e => setEditForm({...editForm, date: e.target.value, selectedTimes: []})} // เปลี่ยนวัน -> เคลียร์เวลา
                                    className="w-full border border-slate-300 rounded-lg p-2 text-slate-700"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-bold text-slate-500 mb-1 block">สนาม</label>
                                <select 
                                    value={editForm.courtId}
                                    onChange={e => setEditForm({...editForm, courtId: parseInt(e.target.value), selectedTimes: []})} // เปลี่ยนสนาม -> เคลียร์เวลา
                                    className="w-full border border-slate-300 rounded-lg p-2 text-slate-700"
                                >
                                    {courts.map(c => (
                                        <option key={c.id} value={c.id}>{c.name.replace('COURT', 'สนาม')}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* ส่วนเลือกเวลาแบบ Grid */}
                        <div>
                            <label className="text-sm font-bold text-slate-500 mb-2 block flex justify-between">
                                <span>เวลาที่ต้องการ (เลือกได้หลายช่วง)</span>
                                <span className="text-xs font-normal text-slate-400">สีแดง = ไม่ว่าง</span>
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {timeSlots.map(slot => {
                                    const occupied = isSlotOccupied(slot); // เช็คว่าชนคนอื่นไหม
                                    const selected = editForm.selectedTimes.includes(slot); // เช็คว่าเราเลือกอยู่ไหม

                                    return (
                                        <button
                                            key={slot}
                                            disabled={occupied}
                                            onClick={() => toggleTimeSlot(slot)}
                                            className={`
                                                text-xs py-2 px-1 rounded-lg border font-bold transition-all
                                                ${occupied 
                                                    ? 'bg-red-50 text-red-300 border-red-100 cursor-not-allowed' // ไม่ว่าง
                                                    : selected 
                                                        ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-105' // เลือกอยู่
                                                        : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:bg-blue-50' // ว่าง
                                                }
                                            `}
                                        >
                                            {slot} {occupied && '🚫'}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 mt-8 pt-4 border-t">
                        <button onClick={() => setEditingBooking(null)} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold transition">ปิดหน้าต่าง</button>
                        <button onClick={handleSaveEdit} className="flex-1 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 font-bold shadow-lg shadow-blue-200 transition">บันทึกการเปลี่ยนแปลง</button>
                    </div>
                </div>
            </div>
        )}

        {/* ... (ส่วนแสดงตารางด้านล่าง เหมือนเดิม ไม่ต้องแก้) ... */}
        {/* Header และตัวกรอง */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 flex flex-col xl:flex-row justify-between items-center gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
                <h2 className="text-xl font-extrabold text-slate-800 whitespace-nowrap">📅 ประวัติการจอง</h2>
                <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200 w-full sm:w-auto">
                    <input 
                        type="date" 
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="bg-transparent text-sm font-bold text-slate-600 focus:outline-none cursor-pointer w-full sm:w-auto"
                    />
                    {filterDate && (
                        <button onClick={() => setFilterDate('')} className="text-xs text-red-500 hover:text-red-700 font-bold px-2 whitespace-nowrap">ดูทั้งหมด</button>
                    )}
                </div>
            </div>
            <div className="flex gap-2 flex-wrap justify-center w-full xl:w-auto overflow-x-auto pb-2 md:pb-0">
                {['all', 'pending', 'approved', 'rejected', 'cancelled'].map(status => (
                    <button 
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap flex-shrink-0 ${
                            filterStatus === status 
                            ? 'bg-blue-600 text-white shadow-md' 
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        {status === 'cancelled' ? 'ยกเลิก' : statusLabels[status]?.split(' ')[0] || status}
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
                        <h3 className="text-lg font-bold text-slate-700">
                            {format(parseISO(group.date), "eeeeที่ d MMMM yyyy", { locale: th })}
                        </h3>
                        <span className="text-xs bg-white border border-slate-200 text-slate-500 px-2 py-1 rounded-full ml-auto md:ml-2">
                            {group.items.length} รายการ
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500 text-xs uppercase hidden md:table-header-group">
                                <tr>
                                    <th className="p-4 w-1/6">เวลาจอง</th>
                                    <th className="p-4 w-1/6">ลูกค้า</th>
                                    <th className="p-4 w-1/6">สนาม</th>
                                    <th className="p-4 w-1/6">เวลาเล่น</th>
                                    <th className="p-4 w-1/6">ราคา</th>
                                    <th className="p-4 w-1/6">สถานะ</th>
                                    <th className="p-4 w-1/6 text-center">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {group.items.map(b => (
                                    <tr key={b.id} className="hover:bg-slate-50 transition-colors flex flex-col md:table-row p-4 md:p-0">
                                        <td className="p-2 md:p-4 text-slate-500 flex justify-between md:table-cell">
                                            <span className="md:hidden font-bold">เวลาทำรายการ:</span>
                                            {format(new Date(b.createdAt), "HH:mm", { locale: th })} น.
                                        </td>
                                        <td className="p-2 md:p-4 flex justify-between md:table-cell">
                                            <span className="md:hidden font-bold">ลูกค้า:</span>
                                            <div>
                                                <div className="font-bold text-slate-800">{b.customerName}</div>
                                                <div className="text-xs font-normal text-slate-400">{b.phoneNumber}</div>
                                            </div>
                                        </td>
                                        <td className="p-2 md:p-4 flex justify-between md:table-cell">
                                            <span className="md:hidden font-bold">สนาม:</span>
                                            <div>
                                                <div className="font-bold text-blue-600">
                                                    {b.court.name.replace('COURT', 'สนาม')}
                                                </div>
                                                <div className="text-[10px] text-slate-400">{b.court.type}</div>
                                            </div>
                                        </td>
                                        <td className="p-2 md:p-4 flex justify-between md:table-cell">
                                            <span className="md:hidden font-bold">เวลาเล่น:</span>
                                            <span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold text-slate-600">
                                                {b.startTime}
                                            </span>
                                        </td>
                                        <td className="p-2 md:p-4 font-bold text-slate-800 flex justify-between md:table-cell">
                                            <span className="md:hidden font-bold">ราคา:</span>
                                            {b.price.toLocaleString()}.-
                                        </td>
                                        <td className="p-2 md:p-4 flex justify-between md:table-cell">
                                            <span className="md:hidden font-bold">สถานะ:</span>
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 w-fit
                                                ${b.status === 'approved' ? 'bg-green-100 text-green-700 border border-green-200' : 
                                                  b.status === 'rejected' ? 'bg-red-100 text-red-700 border border-red-200' : 
                                                  b.status === 'cancelled' ? 'bg-slate-200 text-slate-600 border border-slate-300' :
                                                  'bg-orange-100 text-orange-700 border border-orange-200 animate-pulse'}`}>
                                                {statusLabels[b.status] || b.status}
                                            </span>
                                        </td>
                                        <td className="p-2 md:p-4 text-center md:table-cell flex justify-end">
                                            <button 
                                                onClick={() => openEditModal(b)}
                                                className="bg-slate-100 hover:bg-blue-50 text-slate-400 hover:text-blue-600 p-2 rounded-lg transition"
                                                title="แก้ไข / ยกเลิก"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                            </button>
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
                <p className="text-xs text-slate-300 mt-2">({filterDate ? format(parseISO(filterDate), "d MMM yyyy", { locale: th }) : 'ทั้งหมด'})</p>
                <button onClick={() => setFilterDate('')} className="mt-4 text-blue-600 text-sm hover:underline">ดูทั้งหมด</button>
            </div>
        )}
    </div>
  );
}