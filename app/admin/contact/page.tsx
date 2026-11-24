'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function ContactSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [form, setForm] = useState({
    phoneNumber: '',
    openTime: '',
    lineId: '',
    lineUrl: '',
    facebookName: '',
    facebookUrl: '',
  });

  useEffect(() => {
    fetchContactSetting();
  }, []);

  const fetchContactSetting = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/settings/contact?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setForm({
          phoneNumber: data.phoneNumber || '',
          openTime: data.openTime || '',
          lineId: data.lineId || '',
          lineUrl: data.lineUrl || '',
          facebookName: data.facebookName || '',
          facebookUrl: data.facebookUrl || '',
        });
      }
    } catch (error) {
      console.error('Fetch contact settings error:', error);
      alert('เกิดข้อผิดพลาดในการโหลดข้อมูลช่องทางติดต่อ');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.phoneNumber.trim()) return alert('กรุณากรอกหมายเลขโทรศัพท์');
    if (!form.lineUrl.trim()) return alert('กรุณากรอกลิงก์แอดไลน์');
    if (!form.facebookUrl.trim()) return alert('กรุณากรอกลิงก์เพจ Facebook');

    if (!confirm('ยืนยันการบันทึกข้อมูลช่องทางการติดต่อ?\n(ข้อมูลจะอัปเดตไปยังการ์ดช่องทางจองคอร์ทและส่วนท้ายเว็บทันที)')) {
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/settings/contact', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        alert('✅ บันทึกข้อมูลช่องทางการติดต่อสำเร็จเรียบร้อย!\nหน้าแรกและ Footer เปลี่ยนตามข้อมูลใหม่ทันที');
        if (data.data) {
          setForm({
            phoneNumber: data.data.phoneNumber,
            openTime: data.data.openTime,
            lineId: data.data.lineId,
            lineUrl: data.data.lineUrl,
            facebookName: data.data.facebookName,
            facebookUrl: data.data.facebookUrl,
          });
        }
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการบันทึก');
      }
    } catch (error) {
      console.error('Save contact error:', error);
      alert('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-12 text-center text-slate-500 font-bold">
        กำลังโหลดข้อมูลการติดต่อ...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-14 animate-fade-in">
      {/* Header */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              จัดการช่องทางการติดต่อ
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              แก้ไขเบอร์โทรศัพท์, LINE และเพจ Facebook ที่แสดงบนหน้าแรกและส่วนท้ายเว็บ (Footer)
            </p>
          </div>
        </div>

        <Link
          href="/"
          target="_blank"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition self-start md:self-center"
        >
          <span>ดูหน้าเว็บจริง</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
        </Link>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSave} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Phone */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-pink-500 text-white flex items-center justify-center shadow-md shadow-pink-200">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 text-base">จองผ่านโทรศัพท์</h3>
                <span className="text-[11px] text-slate-400 font-bold block">Phone Contact</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">
                หมายเลขโทรศัพท์ <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.phoneNumber}
                onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                placeholder="เช่น 064-038-8696"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">
                เวลาทำการ / รับสาย
              </label>
              <input
                type="text"
                value={form.openTime}
                onChange={(e) => setForm({ ...form, openTime: e.target.value })}
                placeholder="เช่น 08:00 - 22:00 น."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition"
              />
            </div>
          </div>

          {/* Card 2: Line */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-green-500 text-white flex items-center justify-center font-black text-xs shadow-md shadow-green-200">
                LINE
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 text-base">ทักแชทไลน์ (LINE)</h3>
                <span className="text-[11px] text-slate-400 font-bold block">LINE Official Account</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">
                LINE ID ที่แสดงบนการ์ด
              </label>
              <input
                type="text"
                value={form.lineId}
                onChange={(e) => setForm({ ...form, lineId: e.target.value })}
                placeholder="เช่น @SantiphapBad"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">
                ลิงก์สำหรับกดแอดไลน์ <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                required
                value={form.lineUrl}
                onChange={(e) => setForm({ ...form, lineUrl: e.target.value })}
                placeholder="เช่น https://line.me/R/ti/p/@915avwsq"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                ลูกค้าง่ายต่อการคลิกแล้วเด้งไปหน้าแอดไลน์ทันที
              </span>
            </div>
          </div>

          {/* Card 3: Facebook */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-200">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 text-base">ทัก Inbox เพจ Facebook</h3>
                <span className="text-[11px] text-slate-400 font-bold block">Facebook Page</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">
                ข้อความแสดงบนการ์ด
              </label>
              <input
                type="text"
                value={form.facebookName}
                onChange={(e) => setForm({ ...form, facebookName: e.target.value })}
                placeholder="เช่น ติดตามข่าวสารต่างๆ หรือ สันติภาพ แบดมินตัน"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase">
                ลิงก์เพจ Facebook <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                required
                value={form.facebookUrl}
                onChange={(e) => setForm({ ...form, facebookUrl: e.target.value })}
                placeholder="เช่น https://www.facebook.com/profile.php?id=..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                ลิงก์ URL เต็มของเพจ Facebook
              </span>
            </div>
          </div>

        </div>

        {/* Live Preview Container */}
        <div className="bg-slate-900 text-white p-6 md:p-8 rounded-3xl shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wider block mb-1">
                Live Preview
              </span>
              <h3 className="text-lg font-extrabold text-white">
                ตัวอย่างการแสดงผลบนหน้าแรกจริง
              </h3>
            </div>
            <span className="text-xs bg-white/10 text-slate-300 px-3 py-1 rounded-full">
              อัปเดตตามฟอร์มด้านบน
            </span>
          </div>

          {/* Preview of the 3 Channel Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Preview Phone */}
            <div className="bg-white text-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 bg-pink-500 text-white rounded-xl flex items-center justify-center mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                </div>
                <h4 className="font-bold text-base mb-1">จองผ่านโทรศัพท์</h4>
                <p className="font-extrabold text-slate-800 text-sm">{form.phoneNumber || '0xx-xxx-xxxx'}</p>
                <p className="text-xs text-slate-500 mb-4">{form.openTime || '08:00 - 22:00 น.'}</p>
              </div>
              <div className="w-full py-2 bg-slate-100 text-slate-700 text-xs font-bold text-center rounded-lg">
                กดเพื่อโทรออก
              </div>
            </div>

            {/* Preview Line */}
            <div className="bg-white text-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 bg-green-500 text-white rounded-xl flex items-center justify-center mb-3 font-bold text-xs">
                  LINE
                </div>
                <h4 className="font-bold text-base mb-1">ทักแชทไลน์</h4>
                <p className="text-xs text-slate-500">สอบถามข้อมูล หรือแจ้งปัญหา</p>
                <p className="font-extrabold text-slate-800 text-sm mb-4">{form.lineId || '@LineID'}</p>
              </div>
              <div className="w-full py-2 bg-green-500 text-white text-xs font-bold text-center rounded-lg">
                แอดไลน์
              </div>
            </div>

            {/* Preview Facebook */}
            <div className="bg-white text-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
                </div>
                <h4 className="font-bold text-base mb-1">ทัก Inbox เพจ</h4>
                <p className="text-xs text-slate-500 mb-4">{form.facebookName || 'ติดตามข่าวสารต่างๆ'}</p>
              </div>
              <div className="w-full py-2 bg-blue-600 text-white text-xs font-bold text-center rounded-lg">
                ไปที่เพจ
              </div>
            </div>
          </div>

          {/* Preview of the Footer Links */}
          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-3">
            <span>ตัวอย่าง Footer:</span>
            <div className="flex gap-4 font-semibold text-slate-300">
              <span className="hover:text-white transition">Facebook</span>
              <span>•</span>
              <span className="hover:text-white transition">Line</span>
              <span>•</span>
              <span className="hover:text-white transition">{form.phoneNumber || '0xx-xxx-xxxx'}</span>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-4 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-base shadow-lg shadow-blue-500/25 active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>กำลังบันทึกข้อมูล...</span>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>บันทึกข้อมูลช่องทางการติดต่อ</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
