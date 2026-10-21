'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import generatePayload from 'promptpay-qr';
import QRCode from 'qrcode';

// ฟังก์ชันย่อรูป (สำคัญมาก! ช่วยให้ไฟล์เล็กกว่า 4.5MB ไม่ Error 500 แน่นอน)
const resizeImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = document.createElement('img');
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800; // บีบความกว้างเหลือ 800px (ชัดพอสำหรับดูสลิป)

        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        // แปลงเป็น JPEG คุณภาพ 0.7 (ไฟล์จะเหลือแค่ ~200KB ส่งผ่านฉลุย)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        resolve(dataUrl);
      };
    };
    reader.onerror = reject;
  });
};

function PaymentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const price = searchParams.get('price') || '0';
  const count = searchParams.get('count') || '0';

  const [slipImage, setSlipImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [bookingData, setBookingData] = useState<any>(null);

  // ตัวแปรสำหรับจัดการเวลา 30 นาที (1800 วินาที)
  const [timeLeft, setTimeLeft] = useState<number>(1800);
  const [isExpired, setIsExpired] = useState(false);

  // ข้อมูลพร้อมเพย์ (Dynamic PromptPay)
  const promptPayId = process.env.NEXT_PUBLIC_PROMPTPAY_ID || '0640388696';
  const promptPayName = process.env.NEXT_PUBLIC_PROMPTPAY_NAME || 'นายมงคลชัย ต๊อดแก้ว';
  const promptPayBank = process.env.NEXT_PUBLIC_PROMPTPAY_BANK || 'ธนาคารกรุงไทย';
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [qrLoading, setQrLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  // สร้าง Dynamic PromptPay QR Code พร้อมระบุยอดเงินอัตโนมัติ
  useEffect(() => {
    const numPrice = Number(price);
    if (numPrice > 0 && promptPayId) {
      try {
        const payload = generatePayload(promptPayId, { amount: numPrice });
        QRCode.toDataURL(payload, {
          width: 320,
          margin: 2,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        }).then((url) => {
          setQrCodeUrl(url);
          setQrLoading(false);
        }).catch((err) => {
          console.error('QR generation error:', err);
          setQrLoading(false);
        });
      } catch (err) {
        console.error('PromptPay payload error:', err);
        setQrLoading(false);
      }
    } else {
      setQrLoading(false);
    }
  }, [price, promptPayId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(promptPayId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = () => {
    if (!qrCodeUrl) return;
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `PromptPay_${promptPayId}_${price}THB.png`;
    link.click();
  };

  const formattedPromptPayId = promptPayId.length === 10
    ? `${promptPayId.slice(0, 3)}-${promptPayId.slice(3, 6)}-${promptPayId.slice(6)}`
    : promptPayId;

  // 1. โหลดข้อมูลการจอง
  useEffect(() => {
    const data = localStorage.getItem('tempBooking');
    if (data) {
      setBookingData(JSON.parse(data));
    } else {
      // ถ้าไม่มีข้อมูล ให้กลับไปหน้าแรก
      router.push('/');
    }
  }, [router]);

  // 2. จัดการเวลานับถอยหลังเมื่อโหลดหน้าเว็บ
  useEffect(() => {
    let expireTime = localStorage.getItem('paymentExpireTime');

    if (!expireTime) {
      // ถ้ายังไม่มีเวลาหมดอายุ ให้สร้างใหม่ (ปัจจุบัน + 30 นาที)
      const newExpireTime = Date.now() + 30 * 60 * 1000;
      localStorage.setItem('paymentExpireTime', newExpireTime.toString());
      expireTime = newExpireTime.toString();
    }

    // คำนวณเวลาที่เหลือ
    const remainingTime = Math.floor((parseInt(expireTime) - Date.now()) / 1000);

    if (remainingTime <= 0) {
      setTimeLeft(0);
      handleAutoCancel(); // ถ้าหมดเวลาตั้งแต่เปิดหน้ามา ให้ยกเลิกเลย
    } else {
      setTimeLeft(remainingTime);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 3. ฟังก์ชันนับถอยหลังทุกๆ 1 วินาที
  useEffect(() => {
    if (timeLeft <= 0 || isExpired) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoCancel(); // เมื่อเวลาเหลือ 0 ให้เรียกฟังก์ชันยกเลิก
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, isExpired]);

  // 4. ฟังก์ชันยกเลิกอัตโนมัติ
  const handleAutoCancel = async () => {
    if (isExpired) return;
    setIsExpired(true);

    const tempBookingStr = localStorage.getItem('tempBooking');
    if (tempBookingStr) {
      const tempBooking = JSON.parse(tempBookingStr);
      try {
        // ยิง API ไปยกเลิกทุกคิวที่จองไว้
        if (tempBooking.bookingIds) {
          await Promise.all(tempBooking.bookingIds.map((id: number) =>
            fetch('/api/bookings', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: id, status: 'CANCELLED' })
            })
          ));
        }
      } catch (error) {
        console.error("Auto cancel error:", error);
      }
    }

    // ล้างข้อมูลทิ้งและเด้งกลับหน้าแรก
    localStorage.removeItem('tempBooking');
    localStorage.removeItem('paymentExpireTime');
    alert("หมดเวลาชำระเงิน รายการจองของคุณถูกยกเลิกโดยอัตโนมัติ เนื่องจากไม่ได้รับการยืนยันภายใน 30 นาที");
    router.push('/');
  };

  // แปลงวินาทีเป็นรูปแบบ นาที:วินาที (เช่น 29:59)
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น');
        return;
      }

      try {
        // เรียกใช้ฟังก์ชันย่อรูปก่อนแสดงผล
        const resized = await resizeImage(file);
        setSlipImage(resized);
      } catch (error) {
        console.error("Resize error:", error);
        alert("เกิดข้อผิดพลาดในการประมวลผลรูปภาพ");
      }
    }
  };

  const handleSubmit = async () => {
    if (!slipImage) {
      alert("กรุณาแนบหลักฐานการโอนเงิน");
      return;
    }

    if (!bookingData || !bookingData.bookingIds) {
      alert("ไม่พบข้อมูลการจอง กรุณาทำรายการใหม่");
      router.push('/bookings');
      return;
    }

    setIsUploading(true);

    try {
      // ใช้ PATCH เพื่ออัปเดตสลิปใส่ Booking เดิม
      const updatePromises = bookingData.bookingIds.map((id: number) =>
        fetch('/api/bookings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: id,
            slipUrl: slipImage,
            status: 'PAID_VERIFY' // เปลี่ยนสถานะเป็น "รอตรวจสอบ"
          })
        })
      );

      await Promise.all(updatePromises);

      // ไปหน้า Success และล้างเวลาทิ้ง
      localStorage.removeItem('tempBooking');
      localStorage.removeItem('paymentExpireTime'); // ล้างเวลาทิ้ง
      router.push('/success');

    } catch (error) {
      console.error(error);
      alert("เกิดข้อผิดพลาดในการส่งข้อมูล");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">

      <nav className="bg-white shadow-sm sticky top-0 z-20 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">

          <Link href="/" className="flex items-center gap-2 text-slate-500 font-bold hover:text-slate-800 transition">
            <span>←</span> กลับหน้าหลัก
          </Link>

          <div className="text-lg font-extrabold text-slate-800">ชำระเงิน</div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-8">

        {/* กล่องแสดงเวลานับถอยหลัง */}
        <div className="bg-red-50 border border-red-200 rounded-3xl p-5 mb-6 text-center shadow-sm">
          <p className="text-sm font-bold text-red-500 mb-1">
            กรุณาชำระเงินและแนบสลิปภายในเวลา
          </p>
          <div className="text-4xl font-extrabold text-red-600 animate-pulse my-2 tracking-widest">
            {formatTime(timeLeft)}
          </div>
          <p className="text-xs text-red-400 mt-1">
            หากเกินเวลาที่กำหนด รายการจองจะถูกยกเลิกอัตโนมัติ
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden mb-6">
          <div className="bg-blue-600 p-6 text-center text-white">
            <p className="text-blue-100 text-sm mb-1">ยอดชำระทั้งหมด ({count} รายการ)</p>
            <h1 className="text-4xl font-extrabold">{Number(price).toLocaleString()} <span className="text-lg font-normal">บาท</span></h1>
          </div>

          <div className="p-8">
            <div className="flex flex-col items-center justify-center mb-8">
              {/* PromptPay Official Card */}
              <div className="w-full max-w-sm bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden">
                {/* Header PromptPay */}
                <div className="bg-[#003d6b] text-white px-5 py-3 flex items-center justify-between shadow-inner">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-white flex items-center justify-center text-[#003d6b] font-black text-xs shadow-sm">
                      TH
                    </div>
                    <div>
                      <p className="font-extrabold text-sm leading-tight tracking-wide">พร้อมเพย์</p>
                      <p className="text-[10px] text-blue-200 font-medium">PromptPay</p>
                    </div>
                  </div>
                  <span className="text-[11px] bg-white/20 text-white px-2.5 py-1 rounded-full font-bold">
                    ยอดตรงตามบิล
                  </span>
                </div>

                {/* QR Code Container */}
                <div className="p-6 bg-white flex flex-col items-center justify-center min-h-[280px]">
                  {qrLoading ? (
                    <div className="w-56 h-56 bg-slate-100 rounded-xl animate-pulse flex flex-col items-center justify-center text-xs font-bold text-slate-400 gap-2">
                      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>กำลังสร้าง QR พร้อมเพย์...</span>
                    </div>
                  ) : qrCodeUrl ? (
                    <div className="relative group">
                      <img
                        src={qrCodeUrl}
                        alt={`พร้อมเพย์ ${Number(price).toLocaleString()} บาท`}
                        className="w-56 h-56 object-contain rounded-xl border border-slate-200 shadow-sm transition-transform duration-200 group-hover:scale-[1.02]"
                      />
                    </div>
                  ) : (
                    <div className="w-56 h-56 bg-slate-100 rounded-xl flex items-center justify-center text-xs text-red-500 font-bold p-4 text-center">
                      ไม่สามารถสร้าง QR ได้ กรุณาโอนผ่านหมายเลขพร้อมเพย์ด้านล่าง
                    </div>
                  )}

                  {/* Badge บอกว่าไม่ต้องกรอกยอดเงิน */}
                  <div className="mt-3 flex items-center gap-1.5 text-xs font-extrabold text-emerald-700 bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-200 shadow-xs">
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    <span>ระบุยอดเงินใน QR {Number(price).toLocaleString()} บาท</span>
                  </div>
                </div>

                {/* ปุ่มบันทึกรูป QR */}
                {qrCodeUrl && (
                  <div className="px-5 pb-4">
                    <button
                      onClick={handleDownloadQR}
                      type="button"
                      className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                      บันทึกรูป QR ลงเครื่องเพื่อสแกน
                    </button>
                  </div>
                )}
              </div>

              {/* รายละเอียดบัญชี & ปุ่มคัดลอกเบอร์ */}
              <div className="mt-5 text-center w-full max-w-sm">
                <span className="inline-block bg-blue-50 text-blue-700 text-xs font-extrabold px-3 py-1 rounded-full border border-blue-200 mb-2">
                  {promptPayBank}
                </span>
                <p className="text-slate-800 font-extrabold text-lg">{promptPayName}</p>
                <p className="text-xs text-slate-400 mt-0.5">หมายเลขพร้อมเพย์</p>

                <div
                  className="mt-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-4 py-2.5 rounded-xl cursor-pointer transition active:scale-95 flex items-center justify-between group"
                  onClick={handleCopy}
                  title="คลิกเพื่อคัดลอกหมายเลขพร้อมเพย์"
                >
                  <span className="text-slate-800 font-mono font-extrabold tracking-widest text-base">
                    {formattedPromptPayId}
                  </span>
                  <span className="text-xs bg-white text-blue-600 font-bold px-2.5 py-1 rounded-lg shadow-sm group-hover:bg-blue-600 group-hover:text-white transition">
                    {copied ? '✓ คัดลอกแล้ว!' : 'คลิกเพื่อคัดลอก'}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6">
              <label className="block text-sm font-bold text-slate-700 mb-3">แนบหลักฐานการโอนเงิน (สลิป) <span className="text-red-500">*</span></label>

              <div className="flex items-center justify-center w-full">
                <label className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-2xl cursor-pointer transition relative overflow-hidden ${slipImage ? 'border-green-400 bg-green-50' : 'border-blue-300 bg-blue-50 hover:bg-blue-100'}`}>

                  {slipImage ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center w-full h-full">
                      <img src={slipImage} alt="Preview" className="h-full w-full object-contain" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition text-white font-bold">
                        คลิกเพื่อเปลี่ยนรูป
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <svg className="w-8 h-8 mb-3 text-blue-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2" />
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
                onClick={handleSubmit}
                disabled={isUploading || isExpired}
                className={`w-full text-white py-4 rounded-xl font-bold text-lg shadow-lg transition-all 
                            ${(isUploading || isExpired) ? 'bg-slate-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 active:scale-95'}
                        `}
              >
                {isUploading ? 'กำลังบันทึกข้อมูล...' : isExpired ? 'หมดเวลาชำระเงิน' : 'แจ้งชำระเงิน'}
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
    <Suspense fallback={<div className="text-center p-10 font-bold text-slate-500">Loading...</div>}>
      <PaymentContent />
    </Suspense>
  )
}