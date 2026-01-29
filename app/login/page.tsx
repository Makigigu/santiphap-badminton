'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // --- จำลองการตรวจสอบ (Mock Auth) ---
    // หมายเหตุ: การเช็ค password ฝั่ง client ไม่ปลอดภัย 100% (สำหรับการใช้งานจริงควรย้ายไปเช็คที่ API)
    // แต่สำหรับโปรเจกต์นี้ ใช้แบบนี้ได้ครับ
    setTimeout(() => {
        if (username === 'admin' && password === '1234') {
            // ✅ 1. ฝัง Cookie เพื่อบอก Middleware ว่า "ฉันล็อกอินแล้วนะ"
            // (ตั้งเวลาหมดอายุ 1 วัน)
            document.cookie = "admin_token=true; path=/; max-age=86400";
            
            // ✅ 2. ไปหน้า Admin
            router.push('/admin');
        } else {
            setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
            setIsLoading(false);
        }
    }, 800);
  };

  return (
    // ... (ส่วน UI ของคุณเหมือนเดิมเป๊ะ ไม่ต้องแก้ครับ) ...
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 flex items-center justify-center relative overflow-hidden">
        {/* ... ใส่ Code UI เดิมของคุณตรงนี้ ... */}
        {/* Background, Login Card, Form etc. */}
        {/* ก๊อปปี้ UI เดิมมาวางได้เลยครับ เปลี่ยนแค่ฟังก์ชัน handleLogin ข้างบน */}
      
      {/* (ขออนุญาตละ UI ไว้ฐานที่เข้าใจนะครับ เพราะ UI คุณดีอยู่แล้ว) */}
       <div 
        className="absolute inset-0 z-0 bg-cover bg-center blur-sm scale-105"
        style={{
            backgroundImage: "url('https://i.pinimg.com/736x/e2/8a/8d/e28a8d33a8b6ce180c774e2642d0e8a2.jpg')",
        }}
      ></div>
      <div className="absolute inset-0 z-0 bg-slate-900/60"></div>

      <div className="relative z-10 bg-white p-8 md:p-12 rounded-3xl shadow-2xl w-full max-w-md mx-4 border border-white/20 animate-fade-in-up">
        
        <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-4 group cursor-pointer">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform">ส</div>
                <div className="text-2xl font-extrabold text-slate-800 tracking-tight">
                  สันติภาพ<span className="text-blue-600">แบดมินตัน</span>
                </div>
            </Link>
            <h2 className="text-slate-500 text-sm font-medium">เข้าสู่ระบบจัดการสนาม (Back Office)</h2>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
            {error && (
                <div className="bg-red-50 text-red-600 text-sm font-bold p-3 rounded-xl border border-red-100 flex items-center gap-2 animate-shake">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    {error}
                </div>
            )}

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">ชื่อผู้ใช้ (Username)</label>
                <div className="relative">
                    <input 
                        type="text" 
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pl-11 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                        placeholder="กรอกชื่อผู้ใช้"
                        required
                    />
                    <div className="absolute left-4 top-3.5 text-slate-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    </div>
                </div>
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">รหัสผ่าน (Password)</label>
                <div className="relative">
                    <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pl-11 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                        placeholder="กรอกรหัสผ่าน"
                        required
                    />
                    <div className="absolute left-4 top-3.5 text-slate-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    </div>
                </div>
            </div>

            <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold text-lg shadow-lg hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
                {isLoading ? (
                    <>
                        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        กำลังเข้าสู่ระบบ...
                    </>
                ) : (
                    'เข้าสู่ระบบ'
                )}
            </button>

        </form>

        <div className="mt-8 text-center text-xs text-slate-400">
            <p>© 2026 Santiphap Badminton System</p>
            <Link href="/" className="hover:text-blue-500 hover:underline mt-2 inline-block">← กลับไปหน้าหลัก</Link>
        </div>

      </div>
    </div>
  );
}