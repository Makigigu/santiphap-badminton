'use client';

import Link from 'next/link';

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex items-center justify-center p-4">
      
      <div className="bg-white p-10 rounded-3xl shadow-xl border border-slate-100 max-w-md w-full text-center animate-scale-in">
        
        {/* Success Icon */}
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
        </div>

        <h1 className="text-2xl font-extrabold text-slate-800 mb-2">แจ้งชำระเงินสำเร็จ!</h1>
        <p className="text-slate-500 mb-8 leading-relaxed text-sm">
            ระบบได้รับหลักฐานการโอนเงินเรียบร้อยแล้ว <br/>
            ทางเจ้าหน้าที่จะเร่งตรวจสอบและอนุมัติการจองโดยเร็วที่สุด <br/>
            <span className="text-slate-400 text-xs mt-1 block">(ปกติใช้เวลาประมาณ 10-15 นาที)</span>
        </p>

        <div className="space-y-3">
            {/* ปุ่มหลัก: ไปดูประวัติเพื่อเช็คสถานะ */}
            <Link href="/history" className="block w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200 active:scale-95">
                ดูประวัติ / สถานะการจอง
            </Link>
            
            {/* ปุ่มรอง: กลับหน้าแรก */}
            <Link href="/" className="block w-full bg-slate-100 text-slate-600 border border-slate-200 py-3.5 rounded-xl font-bold hover:bg-slate-200 transition active:scale-95">
                กลับหน้าหลัก
            </Link>
        </div>

      </div>

    </div>
  );
}