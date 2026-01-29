'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

// --- Types ---
type BookingItem = {
  id: string;
  customerName: string;
  phoneNumber: string;
  date: string;
  startTime: string;
  price: number;
  status: string;
  slipUrl: string | null;
  createdAt: string;
  court: { name: string; type: string };
};

export default function HistoryPage() {
  const router = useRouter(); 
  const [filter, setFilter] = useState<string>('all');
  const [allBookings, setAllBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(false);
  
  // State สำหรับค้นหาด้วยเบอร์โทร
  const [searchPhone, setSearchPhone] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  // ฟังก์ชันค้นหาประวัติ
  const handleSearch = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!searchPhone.trim()) return;

      setLoading(true);
      try {
          const res = await fetch(`/api/bookings/history?phone=${searchPhone}`);
          if (res.ok) {
              const data = await res.json();
              setAllBookings(data);
              setHasSearched(true);
          }
      } catch (error) {
          console.error(error);
      } finally {
          setLoading(false);
      }
  };

  // Logic กรองข้อมูล (Tab)
  const filteredBookings = allBookings.filter(item => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const bookingDate = new Date(item.date);
    bookingDate.setHours(0, 0, 0, 0);

    const isPastDate = bookingDate.getTime() < today.getTime();
    
    // แปลงสถานะเป็นตัวพิมพ์ใหญ่เพื่อความชัวร์
    const status = item.status.toUpperCase();

    if (filter === 'all') return true;

    if (filter === 'active') {
      // tab กำลังดำเนินการ: (รอจ่าย, รอตรวจ, อนุมัติแล้วแต่วันยังไม่ถึง)
      return ['PENDING', 'PAID_VERIFY', 'APPROVED'].includes(status) && !isPastDate;
    }

    if (filter === 'history') {
      // tab ประวัติเก่า: (จบ, ปฏิเสธ, ยกเลิก หรือ วันที่ผ่านมาแล้ว)
      const isEndedStatus = ['COMPLETED', 'REJECTED', 'CANCELLED'].includes(status);
      return isEndedStatus || isPastDate;
    }

    return true;
  });

  // Helper: เลือกสี Badge
  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-bold border border-red-200 flex items-center gap-1">💰 รอชำระเงิน</span>;
      case 'PAID_VERIFY':
        return <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold border border-yellow-200 flex items-center gap-1">⏳ รอตรวจสอบสลิป</span>;
      case 'APPROVED': 
        return <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-200 flex items-center gap-1">✅ จองสำเร็จ</span>;
      case 'REJECTED':
      case 'CANCELLED':
        return <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-xs font-bold border border-slate-200 flex items-center gap-1">❌ ยกเลิกแล้ว</span>;
      default:
        return <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-xs font-bold border border-slate-200">{status}</span>;
    }
  };

  // Helper: เลือกสีแถบด้านซ้าย
  const getStatusColorClass = (status: string) => {
      switch (status.toUpperCase()) {
          case 'APPROVED': return 'bg-green-500';
          case 'PAID_VERIFY': return 'bg-yellow-400';
          case 'PENDING': return 'bg-red-500';
          default: return 'bg-slate-300';
      }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      
      {/* --- Navbar --- */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md shadow-sm z-50 border-b border-slate-100">
        <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between items-center">
          <button className="flex items-center gap-2 cursor-pointer group" onClick={() => router.back()}>
            <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center group-hover:bg-slate-200 transition text-slate-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </div>
            <span className="font-bold text-slate-700 text-sm">ย้อนกลับ</span>
          </button>
          <h1 className="text-lg font-extrabold text-slate-800">ประวัติการจอง</h1>
          <div className="w-20"></div> 
        </div>
      </nav>

      {/* เนื้อหาหลัก */}
      <main className="max-w-2xl mx-auto px-4 py-8 mt-16">
        
        {/* กล่องค้นหา (Search Box) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-8 text-center">
            <h2 className="text-lg font-bold text-slate-800 mb-2">🔎 ค้นหาประวัติการจองของคุณ</h2>
            <p className="text-sm text-slate-500 mb-4">กรอกเบอร์โทรศัพท์ที่ใช้จอง เพื่อดูรายการย้อนหลัง</p>
            <form onSubmit={handleSearch} className="flex gap-2">
                <input 
                    type="tel" 
                    placeholder="เบอร์โทรศัพท์ (เช่น 081xxxxxxx)" 
                    value={searchPhone}
                    onChange={(e) => setSearchPhone(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    required
                />
                <button 
                    type="submit" 
                    disabled={loading}
                    className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition disabled:bg-slate-300"
                >
                    {loading ? '...' : 'ค้นหา'}
                </button>
            </form>
        </div>

        {/* แสดงเนื้อหาเมื่อค้นหาแล้ว */}
        {hasSearched && (
            <div className="animate-fade-in-up">
                {/* Tabs Menu */}
                <div className="flex p-1 bg-white rounded-xl shadow-sm border border-slate-200 mb-6 sticky top-20 z-40">
                    {['all', 'active', 'history'].map((tab) => (
                        <button 
                            key={tab}
                            onClick={() => setFilter(tab)}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all capitalize ${filter === tab ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            {tab === 'all' && 'ทั้งหมด'}
                            {tab === 'active' && 'กำลังดำเนินการ'}
                            {tab === 'history' && 'ประวัติเก่า'}
                        </button>
                    ))}
                </div>

                {/* Booking List */}
                <div className="space-y-4">
                    {filteredBookings.length > 0 ? filteredBookings.map((item) => (
                        <div key={item.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all relative overflow-hidden group">
                            
                            {/* แถบสีสถานะด้านซ้าย */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${getStatusColorClass(item.status)}`}></div>

                            {/* Header */}
                            <div className="flex justify-between items-start mb-3 pl-3">
                                <div>
                                    <p className="text-[10px] text-slate-400 font-mono mb-1">REF: {item.id.split('-').pop()}</p>
                                    <h3 className="text-lg font-extrabold text-slate-800">
                                        {format(new Date(item.date), "d MMMM yyyy", { locale: th })}
                                    </h3>
                                </div>
                                {getStatusBadge(item.status)}
                            </div>

                            {/* Detail */}
                            <div className="bg-slate-50 rounded-xl p-4 mb-3 border border-slate-100 ml-3">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-xs border border-slate-200 shadow-sm">🏟️</span>
                                    <span className="text-slate-700 font-bold text-sm">{item.court.name.replace('COURT', 'สนาม')} <span className="font-normal text-slate-500">({item.court.type})</span></span>
                                </div>
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-xs border border-slate-200 shadow-sm">🕒</span>
                                    <span className="text-blue-600 font-bold text-sm">{item.startTime} น.</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-xs border border-slate-200 shadow-sm">💰</span>
                                    <span className="text-slate-700 font-bold text-sm">{item.price.toLocaleString()} บาท</span>
                                </div>
                            </div>

                            {/* Footer / Actions */}
                            <div className="flex justify-between items-center pl-3 pt-2 border-t border-slate-100">
                                <p className="text-[10px] text-slate-400">ทำรายการ: {format(new Date(item.createdAt), "d MMM yy HH:mm", { locale: th })}</p>
                                
                                {/* แสดงสถานะเพิ่มเติม */}
                                {item.status === 'PAID_VERIFY' && (
                                    <span className="text-xs text-yellow-600 font-bold flex items-center gap-1">
                                        <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
                                        รอแอดมินตรวจสอบ
                                    </span>
                                )}
                                {item.status === 'PENDING' && (
                                     <Link href={`/payment?price=${item.price}&count=1`} onClick={() => {
                                         // Hack: เก็บข้อมูลชั่วคราวเพื่อให้หน้า Payment ทำงานได้ (กรณีกลับมาจ่ายทีหลัง)
                                         // หมายเหตุ: วิธีที่ดีกว่าคือหน้า Payment ควรดึงข้อมูลจาก API ด้วย ID ได้โดยตรง
                                         const temp = {
                                             bookingIds: [item.id], // ใส่ ID เป็น Array
                                             customerName: item.customerName,
                                             phoneNumber: item.phoneNumber,
                                             courtName: item.court.name,
                                             time: item.startTime
                                         };
                                         localStorage.setItem('tempBooking', JSON.stringify(temp));
                                     }} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-blue-700 transition shadow-sm animate-bounce">
                                        👉 ไปชำระเงิน
                                     </Link>
                                )}
                            </div>

                        </div>
                    )) : (
                        <div className="text-center py-16 text-slate-400 bg-slate-100/50 rounded-3xl border-2 border-dashed border-slate-200">
                            <p className="text-4xl mb-2">📭</p>
                            <p className="text-sm font-medium">ไม่พบประวัติการจองในหมวดนี้</p>
                        </div>
                    )}
                </div>
            </div>
        )}

      </main>
    </div>
  );
}