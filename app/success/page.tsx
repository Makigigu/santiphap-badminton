'use client';

import Link from 'next/link';

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex items-center justify-center p-4">
      
      <div className="bg-white p-10 rounded-3xl shadow-xl border border-slate-100 max-w-md w-full text-center">
        
        {/* Animation Icon */}
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce-slow">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
        </div>

        <h1 className="text-2xl font-extrabold text-slate-800 mb-2">ทำรายการสำเร็จ!</h1>
        <p className="text-slate-500 mb-8 leading-relaxed">
            ระบบได้รับข้อมูลการจองและหลักฐานการโอนเงินเรียบร้อยแล้ว <br/>
            กรุณารอเจ้าหน้าที่ตรวจสอบความถูกต้อง <br/>
            <span className="text-sm text-slate-400">(ใช้เวลาประมาณ 10-15 นาที)</span>
        </p>

        <div className="space-y-3">
            <Link href="/" className="block w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200">
                กลับหน้าหลัก
            </Link>
            <Link href="/history" className="block w-full bg-white text-slate-600 border border-slate-200 py-3 rounded-xl font-bold hover:bg-slate-50 transition">
                ดูประวัติการจอง
            </Link>
        </div>

      </div>

    </div>
  );
}