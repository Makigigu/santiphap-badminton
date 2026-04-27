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
  slipUrl: string | null;
  createdAt: string;
  court: { id: number; name: string; type: string };
};

type GroupedBooking = Booking & {
    ids: string[];
    totalPrice: number;
    timeSlots: string[];
};

type Court = { id: number; name: string; price: number };

const statusLabels: { [key: string]: string } = {
    all: 'ทั้งหมด',
    PENDING: 'รอชำระเงิน',
    PAID_VERIFY: '⏳ รอตรวจสอบสลิป',
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
  const [editingGroup, setEditingGroup] = useState<GroupedBooking | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [editForm, setEditForm] = useState({ 
      date: '', 
      courtId: 0, 
      status: '',
      selectedTimes: [] as string[] // เก็บเวลาที่เลือกใหม่
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

  const handleDeleteGroup = async (ids: string[]) => {
      if (!confirm(`⚠️ คุณต้องการลบ ${ids.length} รายการนี้ถาวรหรือไม่?`)) return;
      try {
          await Promise.all(ids.map(id => 
              fetch('/api/bookings', {
                  method: 'DELETE',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ id }),
              })
          ));
          alert('ลบรายการเรียบร้อย');
          setEditingGroup(null);
          fetchData();
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

  const openEditModal = (group: GroupedBooking) => {
      setEditingGroup(group);
      
      // แปลงเวลา "18:00-19:00 น." -> "18:00-19:00" (ตัด น. ออกเพื่อเทียบ)
      const timesArray = group.timeSlots.map(t => t.replace(' น.', '').trim()).sort();

      setEditForm({
          date: format(new Date(group.date), 'yyyy-MM-dd'),
          courtId: group.court.id,
          status: group.status,
          selectedTimes: timesArray
      });
  };

  // เช็คว่าเวลาว่างไหม (ไม่นับตัวเอง)
  const isSlotOccupied = (slot: string) => {
      if (!editingGroup) return false;
      return bookings.some(b => 
          // วันเดียวกัน + สนามเดียวกัน + เวลานี้
          format(new Date(b.date), 'yyyy-MM-dd') === editForm.date &&
          b.court.id === editForm.courtId &&
          b.startTime.includes(slot) &&
          // สถานะต้องไม่ถูกยกเลิก/ปฏิเสธ
          !['REJECTED', 'CANCELLED', 'rejected', 'cancelled'].includes(b.status) &&
          // และต้องไม่ใช่ ID ของกลุ่มที่เรากำลังแก้อยู่
          !editingGroup.ids.includes(b.id)
      );
  };

  const toggleEditTimeSlot = (slot: string) => {
      setEditForm(prev => {
          const exists = prev.selectedTimes.includes(slot);
          return exists 
            ? { ...prev, selectedTimes: prev.selectedTimes.filter(t => t !== slot) }
            : { ...prev, selectedTimes: [...prev.selectedTimes, slot].sort() };
      });
  };

  // ระบบบันทึกแบบอัจฉริยะ (Sync Changes)
  const handleSaveEdit = async () => {
      if (!editingGroup) return;
      if (editForm.selectedTimes.length === 0) return alert("กรุณาเลือกเวลาอย่างน้อย 1 ช่อง หรือกดลบทั้งกลุ่ม");
      if (!confirm(`ยืนยันการแก้ไขข้อมูล?\n(จำนวนชั่วโมง: ${editForm.selectedTimes.length} ชม.)`)) return;
      
      try {
          const originalIds = editingGroup.ids;
          const newTimes = editForm.selectedTimes;
          const selectedCourt = courts.find(c => c.id === editForm.courtId);
          const unitPrice = selectedCourt ? selectedCourt.price : 0;

          const promises = [];

          // อัปเดตรายการเดิมที่มีอยู่ (Update Existing)
          // จับคู่ ID เดิม กับ เวลาใหม่ (ตัวต่อตัว)
          const commonCount = Math.min(originalIds.length, newTimes.length);
          for (let i = 0; i < commonCount; i++) {
              promises.push(
                  fetch('/api/bookings', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                          id: originalIds[i],
                          date: editForm.date,
                          startTime: newTimes[i], // ใช้เวลาใหม่
                          courtId: editForm.courtId,
                          status: editForm.status,
                          // อัปเดตราคาด้วย (เผื่อย้ายไปสนามที่แพงขึ้น/ถูกลง)
                          price: unitPrice 
                      })
                  })
              );
          }

          // ถ้าเลือกเวลาเพิ่ม -> สร้างรายการใหม่ (Create New)
          if (newTimes.length > originalIds.length) {
             for (let i = commonCount; i < newTimes.length; i++) {
                 promises.push(
                     fetch('/api/bookings', {
                         method: 'POST',
                         headers: { 'Content-Type': 'application/json' },
                         body: JSON.stringify({
                             customerName: editingGroup.customerName,
                             phoneNumber: editingGroup.phoneNumber,
                             date: editForm.date,
                             startTime: newTimes[i],
                             courtId: editForm.courtId,
                             price: unitPrice,
                             status: editForm.status,
                             slipUrl: editingGroup.slipUrl // ใช้สลิปเดิม
                         })
                     })
                 );
             }
          }

          // ถ้าเลือกเวลาน้อยลง -> ลบรายการส่วนเกินทิ้ง (Delete Excess)
          if (originalIds.length > newTimes.length) {
              for (let i = commonCount; i < originalIds.length; i++) {
                  promises.push(
                      fetch('/api/bookings', {
                          method: 'DELETE',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ id: originalIds[i] })
                      })
                  );
              }
          }

          await Promise.all(promises);
          alert("บันทึกข้อมูลเรียบร้อย"); 
          setEditingGroup(null); 
          fetchData();

      } catch (error) { 
          console.error(error); 
          alert("เกิดข้อผิดพลาด"); 
      }
  };

  // Helper: เลือกสี Badge
  const getStatusBadge = (status: string) => {
      const s = status.toUpperCase();
      switch (s) {
          case 'PAID_VERIFY': return <span className="bg-yellow-100 text-yellow-700 border border-yellow-200 px-3 py-1 rounded-full text-xs font-bold animate-pulse">⏳ รอตรวจสอบ</span>;
          case 'PENDING': return <span className="bg-red-100 text-red-600 border border-red-200 px-3 py-1 rounded-full text-xs font-bold">💰 รอชำระเงิน</span>;
          case 'APPROVED': return <span className="bg-green-100 text-green-700 border border-green-200 px-3 py-1 rounded-full text-xs font-bold">✅ อนุมัติ</span>;
          case 'REJECTED': return <span className="bg-slate-100 text-red-600 border border-red-200 px-3 py-1 rounded-full text-xs font-bold">❌ ปฏิเสธ</span>;
          default: return <span className="bg-slate-100 text-slate-500 border border-slate-200 px-3 py-1 rounded-full text-xs font-bold">{status}</span>;
      }
  };

  // Logic Grouping
  const groupedBookings = useMemo(() => {
    const filtered = bookings.filter(b => {
        const matchesStatus = filterStatus === 'all' || b.status.toUpperCase() === filterStatus.toUpperCase();
        let matchesDate = true;
        if (filterDate) {
            matchesDate = format(new Date(b.date), 'yyyy-MM-dd') === filterDate;
        }
        return matchesStatus && matchesDate;
    });

    const dateGroups: { [key: string]: Booking[] } = {};
    filtered.forEach(booking => {
        const dateKey = format(new Date(booking.date), 'yyyy-MM-dd');
        if (!dateGroups[dateKey]) dateGroups[dateKey] = [];
        dateGroups[dateKey].push(booking);
    });

    return Object.keys(dateGroups)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
        .map(dateKey => {
            const rawBookings = dateGroups[dateKey];
            const subGroups: { [key: string]: GroupedBooking } = {};

            rawBookings.forEach(b => {
                const groupKey = `${b.customerName}-${b.phoneNumber}-${b.court.id}-${b.status}`;
                if (!subGroups[groupKey]) {
                    subGroups[groupKey] = {
                        ...b,
                        ids: [b.id],
                        totalPrice: b.price,
                        timeSlots: [b.startTime]
                    };
                } else {
                    subGroups[groupKey].ids.push(b.id);
                    subGroups[groupKey].totalPrice += b.price;
                    subGroups[groupKey].timeSlots.push(b.startTime);
                    if (b.slipUrl && !subGroups[groupKey].slipUrl) subGroups[groupKey].slipUrl = b.slipUrl;
                }
            });

            return { 
                date: dateKey, 
                items: Object.values(subGroups).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) 
            };
        });
  }, [bookings, filterStatus, filterDate]);

  if (loading) return <div className="p-10 text-center text-slate-500">กำลังโหลดข้อมูล...</div>;

  return (
    <div className="space-y-6 animate-fade-in relative p-6 bg-slate-50 min-h-screen">
        
        {/* Image Modal */}
        {previewImage && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4 cursor-pointer" onClick={() => setPreviewImage(null)}>
                <img src={previewImage} alt="Slip Full" className="max-h-screen object-contain" />
            </div>
        )}

        {/* Edit Modal (จัดการกลุ่ม) */}
        {editingGroup && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 animate-scale-in max-h-[95vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-4 border-b pb-2">
                        <h3 className="text-xl font-bold text-slate-800">จัดการการจอง ({editingGroup.ids.length} รายการ)</h3>
                        <button onClick={() => setEditingGroup(null)} className="text-slate-400 hover:text-red-500 text-2xl">×</button>
                    </div>
                    
                    <div className="space-y-5">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">ลูกค้า</label>
                                <div className="text-slate-800 font-bold text-lg">{editingGroup.customerName}</div>
                                <div className="text-slate-500 text-sm">{editingGroup.phoneNumber}</div>
                            </div>
                            <div className="text-right">
                                <label className="text-xs font-bold text-slate-500 uppercase">ราคารวมใหม่</label>
                                {/* คำนวณราคา Real-time ตามจำนวนช่องที่เลือก */}
                                <div className="text-blue-600 font-extrabold text-xl">
                                    {((courts.find(c => c.id === editForm.courtId)?.price || 0) * editForm.selectedTimes.length).toLocaleString()}.-
                                </div>
                            </div>
                        </div>

                        {editingGroup.slipUrl && (
                            <div className="text-center bg-slate-50 p-2 rounded-lg border border-dashed border-slate-300">
                                <label className="text-xs font-bold text-slate-500 mb-2 block">หลักฐานการโอน</label>
                                <img 
                                    src={editingGroup.slipUrl} 
                                    alt="Slip" 
                                    className="h-32 mx-auto rounded-lg border cursor-pointer hover:opacity-80 transition"
                                    onClick={() => setPreviewImage(editingGroup.slipUrl!)}
                                />
                                <p className="text-[10px] text-slate-400 mt-1">(คลิกเพื่อขยาย)</p>
                            </div>
                        )}

                        <div>
                            <label className="text-sm font-bold text-slate-700 mb-1 block">เปลี่ยนสถานะ</label>
                            <select 
                                value={editForm.status}
                                onChange={e => setEditForm({...editForm, status: e.target.value})}
                                className="w-full border-2 rounded-lg p-2 font-bold bg-white text-slate-700 focus:border-blue-500 focus:outline-none"
                            >
                                <option value="PENDING">🔴 รอชำระเงิน</option>
                                <option value="PAID_VERIFY">🟡 รอตรวจสอบสลิป</option>
                                <option value="APPROVED">🟢 อนุมัติ (เรียบร้อย)</option>
                                <option value="REJECTED">❌ ปฏิเสธ</option>
                                <option value="CANCELLED">⚪ ยกเลิก</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-bold text-slate-500 mb-1 block">วันที่</label>
                                <input 
                                    type="date" 
                                    value={editForm.date}
                                    onChange={e => setEditForm({...editForm, date: e.target.value})} // เปลี่ยนวันที่ -> เช็คว่างใหม่
                                    className="w-full border border-slate-300 rounded-lg p-2 text-slate-700"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-bold text-slate-500 mb-1 block">สนาม</label>
                                <select 
                                    value={editForm.courtId}
                                    onChange={e => setEditForm({...editForm, courtId: parseInt(e.target.value)})} // เปลี่ยนสนาม -> เช็คว่างใหม่
                                    className="w-full border border-slate-300 rounded-lg p-2 text-slate-700"
                                >
                                    {courts.map(c => (
                                        <option key={c.id} value={c.id}>{c.name.replace('COURT', 'สนาม')}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* ตารางเลือกเวลาแบบแก้ไขได้ */}
                        <div>
                            <label className="text-sm font-bold text-slate-500 mb-2 block flex justify-between">
                                <span>เวลาที่จอง (แก้ไขได้)</span>
                                <span className="text-xs font-normal text-slate-400">สีแดง = ไม่ว่าง</span>
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {timeSlots.map(slot => {
                                    const occupied = isSlotOccupied(slot);
                                    const selected = editForm.selectedTimes.includes(slot);

                                    return (
                                        <button
                                            key={slot}
                                            disabled={occupied}
                                            onClick={() => toggleEditTimeSlot(slot)}
                                            className={`
                                                text-xs py-2 px-1 rounded-lg border font-bold transition-all
                                                ${occupied 
                                                    ? 'bg-red-50 text-red-300 border-red-100 cursor-not-allowed' 
                                                    : selected 
                                                        ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-105'
                                                        : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:bg-blue-50'
                                                }
                                            `}
                                        >
                                            {slot} {occupied && '🔒'}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 mt-8 pt-4 border-t">
                        <button onClick={() => handleDeleteGroup(editingGroup.ids)} className="py-3 px-4 rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 font-bold transition flex items-center justify-center gap-2">
                            <span>🗑️</span> ลบทั้งกลุ่ม
                        </button>
                        <div className="flex-1"></div>
                        <button onClick={() => setEditingGroup(null)} className="py-3 px-6 rounded-xl border border-slate-200 text-slate-600 font-bold">ยกเลิก</button>
                        <button onClick={handleSaveEdit} className="py-3 px-6 rounded-xl bg-blue-600 text-white font-bold shadow-lg hover:bg-blue-700">บันทึก</button>
                    </div>
                </div>
            </div>
        )}

        {/* Filter Bar & Table (เหมือนเดิม) */}
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

            <div className="flex gap-2 flex-wrap justify-center overflow-x-auto pb-2 md:pb-0">
                {['all', 'PAID_VERIFY', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].map(status => (
                    <button key={status} onClick={() => setFilterStatus(status)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${filterStatus === status ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600'}`}>
                        {status === 'PAID_VERIFY' ? 'รอตรวจสอบ' : statusLabels[status] || status}
                    </button>
                ))}
            </div>
        </div>

        {groupedBookings.length > 0 ? (
            groupedBookings.map((group) => (
                <div key={group.date} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="bg-slate-100/50 px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                        <span className="text-2xl">🗓️</span>
                        <h3 className="text-lg font-bold text-slate-700">{format(parseISO(group.date), "eeeeที่ d MMMM yyyy", { locale: th })}</h3>
                        <span className="text-xs bg-white border border-slate-200 text-slate-500 px-2 py-1 rounded-full ml-auto md:ml-2">
                            {group.items.length} รายการ (กลุ่ม)
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500 text-xs uppercase hidden md:table-header-group">
                                <tr>
                                    <th className="p-4">เวลาจอง</th>
                                    <th className="p-4">ลูกค้า</th>
                                    <th className="p-4">สนาม</th>
                                    <th className="p-4">เวลาเล่น</th>
                                    <th className="p-4">ราคารวม</th>
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
                                            <div className="flex flex-wrap gap-1">
                                                {/* แสดงเวลาแบบรวมกลุ่ม */}
                                                {b.timeSlots.sort().map((t, i) => (
                                                    <span key={i} className="bg-slate-100 px-2 py-1 rounded text-xs font-bold text-slate-600 whitespace-nowrap">
                                                        {t} น.
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="p-2 md:p-4 font-bold text-slate-800 md:table-cell flex justify-between">
                                            <span className="md:hidden font-bold">ราคารวม:</span> 
                                            {b.totalPrice.toLocaleString()}.-
                                        </td>
                                        <td className="p-2 md:p-4 md:table-cell flex justify-between">
                                            <span className="md:hidden font-bold">สถานะ:</span>
                                            {getStatusBadge(b.status)}
                                        </td>
                                        <td className="p-2 md:p-4 text-center md:table-cell flex justify-end">
                                            <button onClick={() => openEditModal(b)} className="bg-slate-100 hover:bg-blue-50 text-slate-400 hover:text-blue-600 p-2 rounded-lg transition" title="จัดการกลุ่มนี้">
                                                แก้ไข
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
            </div>
        )}
    </div>
  );
}