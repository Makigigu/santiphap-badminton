'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, useEffect } from 'react';

function PaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const price = searchParams.get('price') || '0';
  const count = searchParams.get('count') || '0';

  // State
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingData, setBookingData] = useState<any>(null);

  useEffect(() => {
    const temp = localStorage.getItem('tempBooking');
    if (temp) {
        setBookingData(JSON.parse(temp));
    } else {
        router.push('/');
    }
  }, [router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
          // เช็คประเภทไฟล์
          if (!selectedFile.type.startsWith('image/')) {
              alert('กรุณาอัปโหลดเฉพาะไฟล์รูปภาพ');
              return;
          }
          setFile(selectedFile);
          setPreviewUrl(URL.createObjectURL(selectedFile));
      }
  };

  // 🔥 ฟังก์ชันย่อรูปภาพ (สำคัญมาก! ช่วยแก้ปัญหาไฟล์ใหญ่เกิน)
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                // กำหนดขนาดสูงสุด (เช่น กว้างไม่เกิน 800px)
                const maxWidth = 800;
                const scaleSize = maxWidth / img.width;
                const newWidth = maxWidth;
                const newHeight = img.height * scaleSize;

                canvas.width = newWidth;
                canvas.height = newHeight;

                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, newWidth, newHeight);

                // แปลงเป็น Base64 แบบลดคุณภาพเหลือ 0.7 (70%)
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                resolve(compressedBase64);
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
  };

  const handlePaymentSubmit = async () => {
      if (!file) {
          alert("กรุณาแนบหลักฐานการโอนเงิน (สลิป)");
          return;
      }
      if (!bookingData) return;

      try {
          setIsSubmitting(true);

          // ✅ ใช้ฟังก์ชันย่อรูปแทนการแปลงตรงๆ
          const base64Image = await compressImage(file);

          const payload = {
              customerName: bookingData.customerName,
              phoneNumber: bookingData.phoneNumber,
              date: new Date(), 
              startTime: bookingData.time,
              price: parseInt(price),
              slipUrl: base64Image, // ส่งรูปที่ย่อแล้ว
              courtName: bookingData.courtName 
          };

          const res = await fetch('/api/bookings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
          });

          // อ่าน Error จาก API ถ้ามี
          if (!res.ok) {
              const errorData = await res.json();
              throw new Error(errorData.error || 'Booking failed');
          }

          localStorage.removeItem('tempBooking');
          router.push('/success');

      } catch (error) {
          console.error(error);
          alert("เกิดข้อผิดพลาด: ไฟล์ภาพอาจใหญ่เกินไป หรือระบบขัดข้อง");
      } finally {
          setIsSubmitting(false);
      }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      
      <nav className="bg-white shadow-sm sticky top-0 z-20 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/booking" className="flex items-center gap-2 text-slate-500 font-bold hover:text-slate-800 transition">
              <span>←</span> ย้อนกลับ
          </Link>
          <div className="text-lg font-extrabold text-slate-800">ชำระเงิน</div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-8">
        
        <div className="bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden mb-6">
            <div className="bg-blue-600 p-6 text-center text-white">
                <p className="text-blue-100 text-sm mb-1">ยอดชำระทั้งหมด ({count} รายการ)</p>
                <h1 className="text-4xl font-extrabold">{parseInt(price).toLocaleString()} <span className="text-lg font-normal">บาท</span></h1>
            </div>
            
            <div className="p-8">
                <div className="flex flex-col items-center justify-center mb-8">
                    <div className="w-64 h-64 bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center mb-4 relative overflow-hidden group">
                        <img 
                            src="https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg" 
                            alt="Payment QR Code" 
                            className="w-48 h-48 opacity-80"
                        />
                    </div>
                    <p className="text-slate-800 font-bold text-lg">ธนาคารกสิกรไทย</p>
                    <p className="text-slate-500">ชื่อบัญชี: สันติภาพ แบดมินตัน</p>
                    <p className="text-slate-500 font-mono bg-slate-100 px-3 py-1 rounded mt-2">xxx-x-xxxxx-x</p>
                </div>

                <div className="border-t border-slate-100 pt-6">
                    <label className="block text-sm font-bold text-slate-700 mb-3">แนบหลักฐานการโอนเงิน (สลิป) <span className="text-red-500">*</span></label>
                    
                    <div className="flex items-center justify-center w-full">
                        <label className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-2xl cursor-pointer transition relative overflow-hidden ${file ? 'border-green-400 bg-green-50' : 'border-blue-300 bg-blue-50 hover:bg-blue-100'}`}>
                            
                            {previewUrl ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <img src={previewUrl} alt="Preview" className="h-full object-contain" />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition text-white font-bold">
                                        คลิกเพื่อเปลี่ยนรูป
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <svg className="w-8 h-8 mb-3 text-blue-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                                    </svg>
                                    <p className="mb-2 text-sm text-blue-500"><span className="font-semibold">คลิกเพื่ออัปโหลด</span></p>
                                    <p className="text-xs text-blue-400">JPG, PNG (ระบบจะย่อรูปอัตโนมัติ)</p>
                                </div>
                            )}
                            
                            <input 
                                type="file" 
                                className="hidden" 
                                accept="image/*"
                                onChange={handleFileChange} 
                            />
                        </label>
                    </div>
                </div>

                <div className="mt-8">
                    <button 
                        onClick={handlePaymentSubmit}
                        disabled={isSubmitting}
                        className={`w-full text-white py-4 rounded-xl font-bold text-lg shadow-lg transition-all ${isSubmitting ? 'bg-slate-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 active:scale-95'}`}
                    >
                        {isSubmitting ? 'กำลังบันทึกข้อมูล...' : 'แจ้งชำระเงิน'}
                    </button>
                </div>
            </div>
        </div>

      </main>
    </div>
  );
}

export default function PaymentPage() {
    return (
        <Suspense fallback={<div className="text-center p-10">Loading...</div>}>
            <PaymentContent />
        </Suspense>
    )
}