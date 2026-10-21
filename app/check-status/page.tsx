'use client';

import Link from 'next/link';
import { useState } from 'react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

export default function CheckStatusPage() {
  const [phone, setPhone] = useState('');
  const [bookings, setBookings] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;
    setLoading(true);
    
    try {
        const res = await fetch(`/api/bookings/history?phone=${encodeURIComponent(phone.trim())}`);
        if (res.ok) {
            const myBookings = await res.json();
            setBookings(myBookings);
            setSearched(true);
        }
    } catch (error) {
        console.error(error);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-10">
      <nav className="bg-white shadow-sm p-4 mb-8">
         <div className="max-w-md mx-auto flex items-center justify-between">
            <Link href="/" className="font-bold text-slate-600 hover:text-blue-600 flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                กลับหน้าหลัก
            </Link>
            <span className="font-bold text-slate-800">ตรวจสอบสถานะ</span>
         </div>
      </nav>

      <div className="max-w-md mx-auto px-4 animate-fade-in-up">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mb-6 text-center">
            <h1 className="text-2xl font-extrabold text-slate-800 mb-2">🔎 ค้นหาการจองของคุณ</h1>
            <p className="text-slate-500 text-sm mb-6">กรอกเบอร์โทรศัพท์ที่ใช้จอง เพื่อดูสถานะล่าสุด</p>
            
            <form onSubmit={handleSearch} className="flex gap-2">
                <input 
                    type="tel" 
                    placeholder="เบอร์โทรศัพท์ (เช่น 089xxxxxxx)" 
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 font-bold text-center"
                    required
                />
            </form>
            <button 
                onClick={handleSearch}
                disabled={loading} 
                className="w-full mt-3 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200"
            >
                {loading ? 'กำลังค้นหา...' : 'ตรวจสอบสถานะ'}
            </button>
        </div>

        {searched && (
            <div className="space-y-4">
                {bookings.length > 0 ? bookings.map((b: any) => (
                    <div key={b.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                            b.status === 'approved' ? 'bg-green-500' : 
                            b.status === 'rejected' ? 'bg-red-500' : 
                            b.status === 'cancelled' ? 'bg-slate-300' :
                            'bg-orange-500'
                        }`}></div>
                        
                        <div className="flex justify-between items-start mb-2 pl-3">
                            <div>
                                <h3 className="font-bold text-slate-800 text-lg">{b.court.name.replace('COURT', 'สนาม')}</h3>
                                <p className="text-sm text-slate-500 font-medium">
                                    {format(new Date(b.date), "d MMM yy", { locale: th })} | <span className="text-slate-800">{b.startTime}</span>
                                </p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                                b.status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' : 
                                b.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' : 
                                b.status === 'cancelled' ? 'bg-slate-50 text-slate-500 border-slate-200' :
                                'bg-orange-50 text-orange-700 border-orange-200'}`}>
                                {b.status === 'pending' ? 'รอตรวจสอบ' : 
                                 b.status === 'approved' ? 'จองสำเร็จ ✅' :
                                 b.status === 'cancelled' ? 'ยกเลิก' : 'ถูกปฏิเสธ ❌'}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm border-t border-slate-50 pt-3 mt-2 pl-3">
                            <span className="text-slate-500 font-bold">ราคา: <span className="text-blue-600">{b.price}.-</span></span>
                            <span className="text-slate-400 text-xs">ทำรายการเมื่อ: {format(new Date(b.createdAt), "d MMM HH:mm", { locale: th })}</span>
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-10 opacity-60">
                        <div className="text-4xl mb-2">📄</div>
                        <div className="text-slate-500">ไม่พบประวัติการจองของเบอร์นี้</div>
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
}