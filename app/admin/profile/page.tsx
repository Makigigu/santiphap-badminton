'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface ProfileData {
  siteName: string;
  slogan: string;
  description: string;
  logoUrl: string;
  heroImageUrl: string;
  aboutImage1Url: string;
  aboutImage2Url: string;
  rulesImageUrl: string;
}

const DEFAULT_PROFILE: ProfileData = {
  siteName: 'สันติภาพแบดมินตัน',
  slogan: 'สนามแบดมินตันมาตรฐาน จังหวัด น่าน',
  description: 'สนามพื้นยางมาตรฐาน ไฟสว่าง มีสิ่งอำนวยความสะดวก พร้อมจองออนไลน์ 24 ชั่วโมง',
  logoUrl: '/logo.jpg',
  heroImageUrl: '/CBadminton.jpg',
  aboutImage1Url: 'https://i.pinimg.com/1200x/e3/b8/89/e3b8892a83a2cb1738291fa31ad32a1c.jpg',
  aboutImage2Url: 'https://i.pinimg.com/736x/1b/98/b7/1b98b7b809d1fb90c76bcf0d892adb7d.jpg',
  rulesImageUrl: 'https://i.pinimg.com/736x/3b/07/70/3b077015daefe8c84e501d2b418fa37d.jpg',
};

export default function ProfileSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const [form, setForm] = useState<ProfileData>(DEFAULT_PROFILE);

  const fileInputRefs = {
    logoUrl: useRef<HTMLInputElement>(null),
    heroImageUrl: useRef<HTMLInputElement>(null),
    aboutImage1Url: useRef<HTMLInputElement>(null),
    aboutImage2Url: useRef<HTMLInputElement>(null),
    rulesImageUrl: useRef<HTMLInputElement>(null),
  };

  useEffect(() => {
    fetchProfileSetting();
  }, []);

  const fetchProfileSetting = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/settings/profile?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setForm({
          siteName: data.siteName || DEFAULT_PROFILE.siteName,
          slogan: data.slogan || DEFAULT_PROFILE.slogan,
          description: data.description || DEFAULT_PROFILE.description,
          logoUrl: data.logoUrl || DEFAULT_PROFILE.logoUrl,
          heroImageUrl: data.heroImageUrl || DEFAULT_PROFILE.heroImageUrl,
          aboutImage1Url: data.aboutImage1Url || DEFAULT_PROFILE.aboutImage1Url,
          aboutImage2Url: data.aboutImage2Url || DEFAULT_PROFILE.aboutImage2Url,
          rulesImageUrl: data.rulesImageUrl || DEFAULT_PROFILE.rulesImageUrl,
        });
      }
    } catch (error) {
      console.error('Fetch profile settings error:', error);
      alert('เกิดข้อผิดพลาดในการโหลดข้อมูลโปรไฟล์');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (field: keyof ProfileData, file: File) => {
    if (!file.type.startsWith('image/')) {
      return alert('กรุณาเลือกไฟล์รูปภาพเท่านั้น (JPG, PNG, WEBP, GIF)');
    }

    if (file.size > 10 * 1024 * 1024) {
      return alert('ขนาดไฟล์เกิน 10MB กรุณาเลือกไฟล์ที่เล็กลง');
    }

    setUploadingField(field);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success && data.url) {
        setForm((prev) => ({
          ...prev,
          [field]: data.url,
        }));
      } else {
        alert(data.error || 'อัปโหลดรูปภาพล้มเหลว');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเพื่ออัปโหลดไฟล์');
    } finally {
      setUploadingField(null);
    }
  };

  const handleReset = (field: keyof ProfileData) => {
    setForm((prev) => ({
      ...prev,
      [field]: DEFAULT_PROFILE[field],
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.siteName.trim()) return alert('กรุณากรอกชื่อสนาม');
    if (!form.logoUrl.trim()) return alert('กรุณาระบุ URL โลโก้หรืออัปโหลดรูป');
    if (!form.heroImageUrl.trim()) return alert('กรุณาระบุภาพแบนเนอร์หลัก');

    if (!confirm('ยืนยันการบันทึกข้อมูลโปรไฟล์และรูปภาพหน้าหลัก?\n(การเปลี่ยนแปลงจะมีผลต่อหน้าหลักทันที)')) {
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/settings/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        alert('✅ บันทึกโปรไฟล์และรูปภาพหน้าหลักสำเร็จเรียบร้อย!\nหน้าแรกเปลี่ยนตามข้อมูลและรูปภาพใหม่ทันที');
        if (data.data) {
          setForm(data.data);
        }
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการบันทึก');
      }
    } catch (error) {
      console.error('Save profile error:', error);
      alert('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-12 text-center text-slate-500 font-bold">
        กำลังโหลดข้อมูลโปรไฟล์และรูปภาพ...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16 animate-fade-in">
      {/* Header */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold mb-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            ปรับแต่งหน้าแรก (Homepage Customization)
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            โปรไฟล์และรูปภาพหน้าเว็บ
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            เปลี่ยนโลโก้ ชื่อสนาม และรูปภาพทั้งหมดบนหน้าหลัก พร้อมระบบแสดงตัวอย่าง (Live Preview) ทันที
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            target="_blank"
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-sm transition flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            ดูหน้าเว็บจริง
          </Link>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-200 transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            {isSaving ? 'กำลังบันทึก...' : '💾 บันทึกการเปลี่ยนแปลง'}
          </button>
        </div>
      </div>

      {/* Grid: Form (Left) vs Live Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* === Form Editor (7 Columns) === */}
        <form onSubmit={handleSave} className="lg:col-span-7 space-y-6">
          
          {/* Card 1: ชื่อสนามและคำบรรยาย */}
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-5">
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">1</span>
              ชื่อสนามและคำโปรยหัวเว็บ
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  ชื่อสนาม (แสดงที่โลโก้ Navbar และ Footer) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.siteName}
                  onChange={(e) => setForm({ ...form, siteName: e.target.value })}
                  placeholder="เช่น สันติภาพแบดมินตัน"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 text-sm font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  สโลแกน / คำโปรยบนแบนเนอร์ (Badge ด้านบนสุด)
                </label>
                <input
                  type="text"
                  value={form.slogan}
                  onChange={(e) => setForm({ ...form, slogan: e.target.value })}
                  placeholder="เช่น สนามแบดมินตันมาตรฐาน จังหวัด น่าน"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  คำบรรยายสั้นใต้แบนเนอร์ (Sub-headline)
                </label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="เช่น สนามพื้นยางมาตรฐาน ไฟสว่าง มีสิ่งอำนวยความสะดวก พร้อมจองออนไลน์ 24 ชั่วโมง"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 text-sm font-medium"
                />
              </div>
            </div>
          </div>

          {/* Card 2: โลโก้สนาม (Logo) */}
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold">2</span>
                โลโก้สนาม (Logo / Profile)
              </h2>
              <button
                type="button"
                onClick={() => handleReset('logoUrl')}
                className="text-xs text-blue-600 hover:text-blue-800 font-bold"
              >
                คืนค่ารูปเดิม
              </button>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                {form.logoUrl ? (
                  <img src={form.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                ) : (
                  <span className="text-xs text-slate-400">ไม่มีรูป</span>
                )}
              </div>

              <div className="flex-grow space-y-2">
                <input
                  type="text"
                  value={form.logoUrl}
                  onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                  placeholder="URL ของโลโก้ เช่น /logo.jpg หรือ https://..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-mono"
                />

                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRefs.logoUrl}
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload('logoUrl', file);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRefs.logoUrl.current?.click()}
                    disabled={uploadingField === 'logoUrl'}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    {uploadingField === 'logoUrl' ? 'กำลังอัปโหลด...' : '📁 เลือกไฟล์จากเครื่อง'}
                  </button>
                  <span className="text-[11px] text-slate-400">แนะนำรูปทรงจัตุรัส (เช่น 200x200 px)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: ภาพแบนเนอร์หลัก (Hero Banner) */}
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-cyan-100 text-cyan-600 flex items-center justify-center text-sm font-bold">3</span>
                ภาพแบนเนอร์หลักหัวเว็บ (Hero Banner)
              </h2>
              <button
                type="button"
                onClick={() => handleReset('heroImageUrl')}
                className="text-xs text-blue-600 hover:text-blue-800 font-bold"
              >
                คืนค่ารูปเดิม
              </button>
            </div>

            <div className="space-y-3">
              <div className="w-full h-36 rounded-2xl border border-slate-200 bg-slate-900 overflow-hidden relative shadow-inner">
                {form.heroImageUrl ? (
                  <img src={form.heroImageUrl} alt="Hero" className="w-full h-full object-cover opacity-80" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">ไม่มีรูป</div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3">
                  <span className="text-[11px] text-white font-medium bg-black/40 px-2.5 py-1 rounded-md backdrop-blur-sm">
                    ตัวอย่างพรีวิวแบนเนอร์
                  </span>
                </div>
              </div>

              <input
                type="text"
                value={form.heroImageUrl}
                onChange={(e) => setForm({ ...form, heroImageUrl: e.target.value })}
                placeholder="URL แบนเนอร์ เช่น /CBadminton.jpg หรือ https://..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-mono"
              />

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRefs.heroImageUrl}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload('heroImageUrl', file);
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRefs.heroImageUrl.current?.click()}
                  disabled={uploadingField === 'heroImageUrl'}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  {uploadingField === 'heroImageUrl' ? 'กำลังอัปโหลด...' : '📁 เลือกไฟล์จากเครื่อง'}
                </button>
                <span className="text-[11px] text-slate-400">แนะนำรูปแนวนอน ความละเอียด 1920x800 px</span>
              </div>
            </div>
          </div>

          {/* Card 4: ภาพเกี่ยวกับเรา 2 รูป (About Us) */}
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm font-bold">4</span>
              ภาพในส่วน "เกี่ยวกับเรา" (About Us - 2 รูป)
            </h2>

            {/* รูปที่ 1 (รูปใหญ่) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase">
                  รูปหลัก (รูปใหญ่ด้านซ้าย)
                </label>
                <button
                  type="button"
                  onClick={() => handleReset('aboutImage1Url')}
                  className="text-xs text-blue-600 hover:text-blue-800 font-bold"
                >
                  คืนค่ารูปเดิม
                </button>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-24 h-24 rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 shrink-0">
                  <img src={form.aboutImage1Url} alt="About 1" className="w-full h-full object-cover" />
                </div>
                <div className="flex-grow space-y-2">
                  <input
                    type="text"
                    value={form.aboutImage1Url}
                    onChange={(e) => setForm({ ...form, aboutImage1Url: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={fileInputRefs.aboutImage1Url}
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload('aboutImage1Url', file);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRefs.aboutImage1Url.current?.click()}
                      disabled={uploadingField === 'aboutImage1Url'}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                    >
                      {uploadingField === 'aboutImage1Url' ? 'กำลังอัปโหลด...' : '📁 เลือกไฟล์'}
                    </button>
                    <span className="text-[11px] text-slate-400">แนะนำรูปแนวตั้งหรือสี่เหลี่ยม (เช่น คอร์ทสนาม)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* รูปที่ 2 (รูปรองมุมขวาล่าง) */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase">
                  รูปรอง (รูปกรอบซ้อนด้านขวาล่าง)
                </label>
                <button
                  type="button"
                  onClick={() => handleReset('aboutImage2Url')}
                  className="text-xs text-blue-600 hover:text-blue-800 font-bold"
                >
                  คืนค่ารูปเดิม
                </button>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-24 h-24 rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 shrink-0">
                  <img src={form.aboutImage2Url} alt="About 2" className="w-full h-full object-cover" />
                </div>
                <div className="flex-grow space-y-2">
                  <input
                    type="text"
                    value={form.aboutImage2Url}
                    onChange={(e) => setForm({ ...form, aboutImage2Url: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={fileInputRefs.aboutImage2Url}
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload('aboutImage2Url', file);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRefs.aboutImage2Url.current?.click()}
                      disabled={uploadingField === 'aboutImage2Url'}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                    >
                      {uploadingField === 'aboutImage2Url' ? 'กำลังอัปโหลด...' : '📁 เลือกไฟล์'}
                    </button>
                    <span className="text-[11px] text-slate-400">แนะนำรูปแอ็กชันหรือบรรยากาศผู้เล่น</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 5: ภาพประกอบระเบียบสนาม (Rules Image) */}
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center text-sm font-bold">5</span>
                ภาพประกอบระเบียบสนาม (Rules Section)
              </h2>
              <button
                type="button"
                onClick={() => handleReset('rulesImageUrl')}
                className="text-xs text-blue-600 hover:text-blue-800 font-bold"
              >
                คืนค่ารูปเดิม
              </button>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-24 h-32 rounded-2xl border-4 border-white shadow-md overflow-hidden bg-slate-900 shrink-0">
                <img src={form.rulesImageUrl} alt="Rules" className="w-full h-full object-cover" />
              </div>

              <div className="flex-grow space-y-2">
                <input
                  type="text"
                  value={form.rulesImageUrl}
                  onChange={(e) => setForm({ ...form, rulesImageUrl: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                />

                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRefs.rulesImageUrl}
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload('rulesImageUrl', file);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRefs.rulesImageUrl.current?.click()}
                    disabled={uploadingField === 'rulesImageUrl'}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                  >
                    {uploadingField === 'rulesImageUrl' ? 'กำลังอัปโหลด...' : '📁 เลือกไฟล์จากเครื่อง'}
                  </button>
                  <span className="text-[11px] text-slate-400">แนะนำรูปแนวตั้ง (เช่น 600x800 px)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-base shadow-xl shadow-blue-200 transition-all hover:-translate-y-0.5 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? 'กำลังบันทึกข้อมูล...' : '💾 บันทึกการเปลี่ยนแปลงโปรไฟล์และรูปภาพทั้งหมด'}
            </button>
          </div>

        </form>

        {/* === Live Preview (5 Columns - Sticky) === */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-6">
          <div className="bg-slate-900 p-6 rounded-3xl text-white shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></span>
                <h3 className="font-extrabold text-base text-white tracking-wide">
                  Live Preview (ตัวอย่างสด)
                </h3>
              </div>
              <span className="text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full">
                จำลองหน้าจริง
              </span>
            </div>

            {/* 1. Preview Navbar */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase text-slate-400">
                1. ตัวอย่างแถบเมนู (Navbar)
              </span>
              <div className="bg-white rounded-2xl p-3 flex items-center justify-between text-slate-900 shadow-md">
                <div className="flex items-center gap-2">
                  <img
                    src={form.logoUrl || '/logo.jpg'}
                    alt="Logo Preview"
                    className="w-8 h-8 object-contain rounded-lg border border-slate-100"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/logo.jpg';
                    }}
                  />
                  <div className="font-extrabold text-sm text-slate-800 tracking-tight">
                    {form.siteName || 'สันติภาพแบดมินตัน'}
                  </div>
                </div>
                <div className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                  ประวัติการจอง
                </div>
              </div>
            </div>

            {/* 2. Preview Hero Banner */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase text-slate-400">
                2. ตัวอย่างแบนเนอร์หลัก (Hero Banner)
              </span>
              <div className="relative h-44 rounded-2xl overflow-hidden border border-slate-700 shadow-md flex items-center justify-center text-center p-4">
                <div
                  className="absolute inset-0 bg-cover bg-center transition-all duration-500"
                  style={{
                    backgroundImage: `url('${form.heroImageUrl || '/CBadminton.jpg'}')`,
                  }}
                ></div>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-slate-950/30"></div>

                <div className="relative z-10 space-y-1.5 max-w-xs">
                  <span className="inline-block py-0.5 px-2 rounded-full bg-blue-500/30 text-blue-200 border border-blue-400/30 text-[10px] font-bold backdrop-blur-sm">
                    {form.slogan || 'สนามแบดมินตันมาตรฐาน จังหวัด น่าน'}
                  </span>
                  <div className="text-base font-extrabold text-white leading-tight">
                    จองสนามง่าย <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                      ตีสแมชได้เต็มที่
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-300 line-clamp-2">
                    {form.description || 'สนามพื้นยางมาตรฐาน ไฟสว่าง มีสิ่งอำนวยความสะดวก'}
                  </p>
                </div>
              </div>
            </div>

            {/* 3. Preview About Us */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase text-slate-400">
                3. ตัวอย่างส่วนเกี่ยวกับเรา (About Us)
              </span>
              <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700 flex items-center gap-4">
                <div className="relative w-28 h-24 shrink-0">
                  <div className="w-20 h-20 rounded-xl overflow-hidden shadow-md border border-slate-600">
                    <img
                      src={form.aboutImage1Url}
                      alt="About 1"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = DEFAULT_PROFILE.aboutImage1Url;
                      }}
                    />
                  </div>
                  <div className="absolute -bottom-2 -right-1 w-14 h-14 rounded-xl overflow-hidden shadow-lg border-2 border-white">
                    <img
                      src={form.aboutImage2Url}
                      alt="About 2"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = DEFAULT_PROFILE.aboutImage2Url;
                      }}
                    />
                  </div>
                </div>

                <div className="text-xs space-y-1">
                  <span className="text-[10px] font-bold text-blue-400 uppercase">เกี่ยวกับเรา</span>
                  <div className="font-bold text-white text-sm">จุดนัดพบของคนรักแบดมินตัน</div>
                  <p className="text-[11px] text-slate-400 line-clamp-2">
                    สนามแบด {form.siteName} ใจกลางเมืองน่าน คอร์ทมาตรฐาน 6 คอร์ท
                  </p>
                </div>
              </div>
            </div>

            {/* 4. Preview Rules Image */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase text-slate-400">
                4. ตัวอย่างภาพประกอบระเบียบสนาม (Rules Section)
              </span>
              <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700 flex items-center gap-4">
                <div className="relative w-20 h-24 rounded-xl overflow-hidden border-2 border-white rotate-2 shadow-lg shrink-0">
                  <img
                    src={form.rulesImageUrl}
                    alt="Rules"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = DEFAULT_PROFILE.rulesImageUrl;
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end justify-center p-1">
                    <span className="text-[8px] font-bold text-white bg-white/20 px-1.5 py-0.5 rounded backdrop-blur-sm">
                      Fair Play
                    </span>
                  </div>
                </div>

                <div className="text-xs space-y-1">
                  <span className="text-[10px] font-bold text-orange-400 uppercase">ข้อตกลงและเงื่อนไข</span>
                  <div className="font-bold text-white text-sm">ระเบียบการใช้สนาม</div>
                  <p className="text-[11px] text-slate-400">
                    รูปภาพนี้จะปรากฏด้านข้างกล่องกฎระเบียบและบัญชีชำระเงิน
                  </p>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 text-center pt-2 border-t border-slate-800">
              💡 ตัวอย่างด้านบนจะอัปเดตแบบเรียลไทม์ตามรูปและข้อความที่คุณกรอก
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
