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
    if(!confirm(`ยืนยันการ${status === 'APPROVED' ? 'อนุมัติ' : 'ปฏิเสธ'}?`)) return;
    
    // แปลงสถานะให้ตรงกับที่ Database เก็บ (ตัวพิมพ์ใหญ่)
    const newStatus = status === 'approved' ? 'APPROVED' : 'rejected';

    const res = await fetch('/api/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus })
    });
    if (res.ok) {
        alert("ทำรายการสำเร็จ");
        fetchData(); 
    }
  };

  // ฟังก์ชันล้างรายการจองที่ค้างเกิน 30 นาที (ต้องมี API รองรับ)
  const handleCleanup = async () => {
    if(!confirm('ต้องการลบรายการจองที่ค้างชำระเกิน 30 นาที ทั้งหมดหรือไม่?')) return;
    try {
        // แจ้งเตือนไว้ก่อนถ้ายังไม่ได้ทำ API นี้
        alert("กำลังจำลองการล้างข้อมูล... (คุณต้องสร้าง API /api/cleanup เพิ่มเติม)");
        fetchData(); 
    } catch (error) {
        console.error("Cleanup error:", error);
    }
  };

  // Logic: กรองเอารายการที่ต้องตรวจสอบ (ทั้ง PENDING และ PAID_VERIFY)
  // แต่เน้น PAID_VERIFY (ส่งสลิปแล้ว) เป็นหลัก
  const pendingReviews = bookings.filter(b => b.status === 'PAID_VERIFY' || b.status === 'PENDING');
  
  // คำนวณรายได้วันนี้ (เฉพาะที่อนุมัติแล้ว)
  const todayIncome = bookings
    .filter(b => (b.status === 'APPROVED' || b.status === 'COMPLETED') && format(new Date(b.date), 'yyyy-MM-dd') === todayStr)
    .reduce((a, b) => a + b.price, 0);

  // --- Logic เช็คสถานะสนาม ---
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
          b.status !== 'cancelled'
      );
      
      return booking ? booking.status : 'free';
  };

  const formatCourtName = (name: string) => name.replace('COURT', 'สนาม');

  if (loading) return <div className="p-10 text-center text-slate-500 font-bold">กำลังโหลดข้อมูล...</div>;

  return (
    <div className="animate-fade-in space-y-8 relative p-6">
       
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
                <h3 className="text-3xl font-extrabold text-orange-500 mt-2">
                    {bookings.filter(b => b.status === 'PAID_VERIFY').length} รายการ
                </h3>
            </div>
       </div>

       {/* Pending Table */}
       <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-orange-50/50">
                <h2 className="text-lg font-extrabold text-slate-800">🔔 รายการล่าสุด (รอตรวจสอบ & รอโอน)</h2>
                
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleCleanup} 
                        className="text-xs bg-red-100 text-red-600 px-3 py-1.5 rounded-full font-bold hover:bg-red-200 transition flex items-center gap-1"
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
                            <th className="p-4">สถานะ</th>
                            <th className="p-4">ยอดเงิน</th>
                            <th className="p-4">หลักฐาน</th>
                            <th className="p-4 text-center">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {pendingReviews.length === 0 ? (
                            <tr><td colSpan={6} className="p-8 text-center text-slate-400">ไม่มีรายการค้าง</td></tr>
                        ) : (
                            pendingReviews.map(b => (
                                <tr key={b.id} className="hover:bg-slate-50">
                                    <td className="p-4">
                                        <div className="font-bold text-slate-700">{format(new Date(b.date), "d MMM", { locale: th })}</div>
                                        <div className="text-xs text-slate-500">{b.startTime} น.</div>
                                    </td>
                                    <td className="p-4">
                                        <div className="font-bold">{b.customerName}</div>
                                        <div className="text-xs text-slate-400">{b.phoneNumber}</div>
                                    </td>
                                    <td className="p-4">
                                        {b.status === 'PAID_VERIFY' ? (
                                            <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-bold border border-yellow-200">
                                                รอตรวจสอบสลิป
                                            </span>
                                        ) : (
                                            <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-bold border border-red-200">
                                                รอชำระเงิน
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 text-slate-700 font-bold">{b.price}.-</td>
                                    <td className="p-4">
                                        {b.slipUrl ? (
                                            <button onClick={() => setSelectedSlip(b.slipUrl)} className="text-blue-600 underline hover:text-blue-800 font-medium text-xs">
                                                📄 ดูสลิป
                                            </button>
                                        ) : <span className="text-slate-300 text-xs">-</span>}
                                    </td>
                                    <td className="p-4 text-center flex justify-center gap-2">
                                        {b.status === 'PAID_VERIFY' && (
                                            <button onClick={() => updateStatus(b.id, 'approved')} className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 transition shadow-sm">
                                                อนุมัติ
                                            </button>
                                        )}
                                        <button onClick={() => updateStatus(b.id, 'rejected')} className="bg-white text-red-500 px-3 py-1 rounded text-xs border border-red-200 hover:bg-red-50 transition">
                                            ยกเลิก
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
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
                                
                                let style = "bg-green-50 text-green-700 border-green-100 hover:bg-green-100";
                                let text = "ว่าง";

                                if (status === 'APPROVED' || status === 'COMPLETED') {
                                    style = "bg-slate-800 text-white border-slate-800";
                                    text = "เต็ม";
                                } 
                                else if (status === 'PENDING') {
                                    style = "bg-red-100 text-red-600 border-red-200";
                                    text = "จอง (รอโอน)";
                                }
                                else if (status === 'PAID_VERIFY') {
                                    style = "bg-yellow-100 text-yellow-700 border-yellow-200 ring-1 ring-yellow-300";
                                    text = "รอตรวจ";
                                }
                                else if (status === 'maintenance') { 
                                    style = "bg-gray-100 text-gray-400 border-gray-200";
                                    text = "ปิด";
                                }

                                return (
                                    <div key={time} className={`text-xs py-1.5 px-2 rounded font-medium border flex justify-between items-center transition-colors ${style}`}>
                                        <span>{time}</span>
                                        <span className="text-[10px]">{text}</span>
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