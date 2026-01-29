'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
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
  court: { name: string };
};

// เพิ่ม type closures
type Court = { 
    id: number; 
    name: string; 
    closures: { startDate: string; endDate: string }[] 
};

const timeSlots = ["11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"];

export default function DashboardPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlip, setSelectedSlip] = useState<string | null>(null);

  // ดึงวันที่ปัจจุบัน YYYY-MM-DD (Local Time)
  const todayStr = format(new Date(), 'yyyy-MM-dd'); 

  const fetchData = async () => {
    try {
        const [bookingsRes, courtsRes] = await Promise.all([
            fetch('/api/bookings', { cache: 'no-store' }),
            fetch('/api/courts', { cache: 'no-store' })
        ]);

        if (bookingsRes.ok && courtsRes.ok) {
            setBookings(await bookingsRes.json());
            setCourts(await courtsRes.json());
        }
    } catch (error) {
        console.error(error);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const updateStatus = async (id: string, status: string) => {
    if(!confirm(`ยืนยันการ${status === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ'}?`)) return;
    const res = await fetch('/api/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
    });
    if (res.ok) fetchData(); 
  };

  // --- NEW: ฟังก์ชันล้างรายการจองที่ค้างเกิน 30 นาที ---
  const handleCleanup = async () => {
    if(!confirm('ต้องการลบรายการจองที่ค้างชำระเกิน 30 นาที ทั้งหมดหรือไม่?')) return;
    try {
        const res = await fetch('/api/cleanup', { method: 'POST' });
        if (res.ok) {
            const data = await res.json();
            alert(`ดำเนินการเรียบร้อย: ${data.message}`);
            fetchData(); // โหลดข้อมูลใหม่ทันที
        } else {
            alert('เกิดข้อผิดพลาดในการล้างข้อมูล');
        }
    } catch (error) {
        console.error("Cleanup error:", error);
        alert('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
    }
  };

  // Logic
  const pendingBookings = bookings.filter(b => b.status === 'pending');
  
  // คำนวณรายได้วันนี้ (เช็คจากวันที่ local)
  const todayIncome = bookings
    .filter(b => b.status === 'approved' && format(new Date(b.date), 'yyyy-MM-dd') === todayStr)
    .reduce((a, b) => a + b.price, 0);

  // --- Logic เช็คสถานะสนาม (รวมปิดปรับปรุง) ---
  const getSlotStatus = (court: Court, timeStart: string) => {
      // 1. เช็คว่าปิดปรับปรุงวันนี้ไหม?
      const isClosedToday = court.closures?.some(closure => {
          const start = format(new Date(closure.startDate), 'yyyy-MM-dd');
          const end = format(new Date(closure.endDate), 'yyyy-MM-dd');
          return todayStr >= start && todayStr <= end;
      });

      if (isClosedToday) return 'maintenance';

      // 2. ถ้าไม่ปิด ให้เช็คการจอง
      const booking = bookings.find(b => 
          format(new Date(b.date), 'yyyy-MM-dd') === todayStr && 
          b.court.name === court.name &&
          b.startTime.includes(timeStart) && 
          b.status !== 'rejected' &&
          b.status !== 'cancelled' // เพิ่มเช็ค cancelled ด้วย
      );
      
      return booking ? booking.status : 'free';
  };

  const formatCourtName = (name: string) => name.replace('COURT', 'สนาม');

  if (loading) return <div className="p-10 text-center text-slate-500">กำลังโหลดข้อมูล...</div>;

  return (
    <div className="animate-fade-in space-y-8 relative">
       
       {/* Modal ดูรูปสลิป */}
       {selectedSlip && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setSelectedSlip(null)}>
           <div className="relative max-w-lg w-full bg-white rounded-xl overflow-hidden shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
             <div className="p-4 border-b flex justify-between items-center">
               <h3 className="font-bold text-lg">หลักฐานการโอนเงิน</h3>
               <button onClick={() => setSelectedSlip(null)} className="text-slate-500 hover:text-red-500 font-bold text-xl">×</button>
             </div>
             <div className="p-4 flex justify-center bg-slate-100">
               <img src={selectedSlip} alt="Slip" className="max-h-[70vh] object-contain rounded-md" />
             </div>
           </div>
         </div>
       )}

       {/* Stats Cards */}
       <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <p className="text-slate-500 text-xs font-bold uppercase">รายได้วันนี้</p>
                <h3 className="text-3xl font-extrabold text-green-600 mt-2">{todayIncome.toLocaleString()} ฿</h3>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <p className="text-slate-500 text-xs font-bold uppercase">รอตรวจสอบ</p>
                <h3 className="text-3xl font-extrabold text-orange-500 mt-2">{pendingBookings.length} รายการ</h3>
            </div>
       </div>

       {/* Pending Table */}
       <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-orange-50/50">
                <h2 className="text-lg font-extrabold text-slate-800">🔔 รอตรวจสอบ ({pendingBookings.length})</h2>
                
                {/* ปุ่มเครื่องมือ (Refresh + Cleanup) */}
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleCleanup} 
                        className="text-xs bg-red-100 text-red-600 px-3 py-1.5 rounded-full font-bold hover:bg-red-200 transition flex items-center gap-1"
                        title="ลบรายการจองที่ค้างชำระเกิน 30 นาที"
                    >
                        <span>🧹</span> ล้างรายการค้าง
                    </button>
                    <button onClick={fetchData} className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1">
                        <span>🔄</span> รีเฟรช
                    </button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                        <tr>
                            <th className="p-4">เวลาจอง</th>
                            <th className="p-4">ลูกค้า</th>
                            <th className="p-4">สนาม</th>
                            <th className="p-4">ยอดเงิน</th>
                            <th className="p-4">หลักฐาน</th>
                            <th className="p-4 text-center">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {pendingBookings.map(b => (
                            <tr key={b.id} className="hover:bg-slate-50">
                                <td className="p-4">{format(new Date(b.createdAt), "d MMM HH:mm", { locale: th })}</td>
                                <td className="p-4">
                                    <div className="font-bold">{b.customerName}</div>
                                    <div className="text-xs text-slate-400">{b.phoneNumber}</div>
                                </td>
                                <td className="p-4">
                                    <span className="font-bold text-blue-600">{formatCourtName(b.court.name)}</span> 
                                    <br/>
                                    <span className="text-xs text-slate-500">{format(new Date(b.date), "d MMM", { locale: th })} {b.startTime}</span>
                                </td>
                                <td className="p-4 text-green-600 font-bold">{b.price}.-</td>
                                <td className="p-4">
                                    {b.slipUrl ? (
                                        <button 
                                            onClick={() => setSelectedSlip(b.slipUrl)} 
                                            className="text-blue-600 underline hover:text-blue-800 font-medium cursor-pointer"
                                        >
                                            ดูสลิป
                                        </button>
                                    ) : '-'}
                                </td>
                                <td className="p-4 text-center flex justify-center gap-2">
                                    <button onClick={() => updateStatus(b.id, 'approved')} className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 transition">อนุมัติ</button>
                                    <button onClick={() => updateStatus(b.id, 'rejected')} className="bg-red-50 text-red-500 px-3 py-1 rounded text-xs border border-red-100 hover:bg-red-100 transition">ปฏิเสธ</button>
                                </td>
                            </tr>
                        ))}
                        {pendingBookings.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-400">ไม่มีรายการค้าง</td></tr>}
                    </tbody>
                </table>
            </div>
       </div>

       {/* Real-time Schedule */}
       <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-extrabold text-slate-800 mb-4">ตารางจองวันนี้ ({format(new Date(), "d MMM yyyy", { locale: th })})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {(courts || []).map(court => (
                    <div key={court.id} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="bg-slate-50 p-3 font-bold text-sm text-center border-b border-slate-100">{formatCourtName(court.name)}</div>
                        <div className="p-2 space-y-1 bg-white h-64 overflow-y-auto">
                            {timeSlots.map(time => {
                                const status = getSlotStatus(court, time);
                                
                                let style = "bg-green-50 text-green-700 border-green-100";
                                let text = "ว่าง";

                                if (status === 'approved') {
                                    style = "bg-slate-800 text-white border-slate-800";
                                    text = "เต็ม";
                                } 
                                else if (status === 'pending') {
                                    style = "bg-orange-100 text-orange-700 border-orange-200 animate-pulse";
                                    text = "รอโอน";
                                }
                                else if (status === 'maintenance') { 
                                    style = "bg-red-50 text-red-400 border-red-100";
                                    text = "ปิด";
                                }

                                return (
                                    <div key={time} className={`text-xs py-1.5 px-2 rounded font-medium border flex justify-between ${style}`}>
                                        <span>{time}</span>
                                        <span>{text}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>
       </div>
    </div>
  );
}