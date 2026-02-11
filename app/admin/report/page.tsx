'use client';

import { useState, useEffect, useMemo } from 'react';
import { format, getDaysInMonth, startOfMonth, addMonths } from 'date-fns';
import { th } from 'date-fns/locale';

type Booking = {
  id: string;
  date: string;
  price: number;
  status: string;
};

type DailyRevenue = {
  date: string;
  day: number;
  count: number;
  total: number;
};

export default function ReportPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRevenue = async () => {
      setLoading(true);
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      try {
        const res = await fetch(`/api/revenue?date=${dateStr}`, { cache: 'no-store' });
        if (res.ok) {
          setBookings(await res.json());
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchRevenue();
  }, [currentDate]);

  const dailyReport = useMemo(() => {
    const daysInMonth = getDaysInMonth(currentDate);
    const report: DailyRevenue[] = [];
    const monthStart = startOfMonth(currentDate);

    for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = format(new Date(monthStart.getFullYear(), monthStart.getMonth(), i), 'yyyy-MM-dd');
        const daysBookings = bookings.filter(b => format(new Date(b.date), 'yyyy-MM-dd') === dateStr);
        const total = daysBookings.reduce((sum, b) => sum + b.price, 0);

        if (total > 0) { 
            report.push({
                date: dateStr,
                day: i,
                count: daysBookings.length,
                total: total
            });
        }
    }
    return report;
  }, [bookings, currentDate]);

  const grandTotal = bookings.reduce((sum, b) => sum + b.price, 0);
  const totalBookings = bookings.length;

  const changeMonth = (amount: number) => {
      setCurrentDate(prev => addMonths(prev, amount));
  };

  return (
    <div className="min-h-screen bg-slate-100 p-8 font-sans text-slate-900 print:bg-white print:p-0">
      
      {/* ✅ สไตล์พิเศษสำหรับการพิมพ์ (ซ่อนวันที่/URL หัวกระดาษ และตั้งขอบ) */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm; /* ตั้งขอบกระดาษ 10mm พอดีสวย ไม่ตกขอบ */
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>

      {/* --- ส่วนควบคุม (ซ่อนตอน Print) --- */}
      <div className="max-w-[210mm] mx-auto mb-6 flex justify-between items-center print:hidden">
         <div className="flex items-center gap-4 bg-white p-2 rounded-xl shadow-sm border border-slate-200">
            <button onClick={() => changeMonth(-1)} className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded-full text-slate-600 transition">◀</button>
            <span className="font-bold text-slate-800 w-32 text-center">
                {format(currentDate, 'MMMM yyyy', { locale: th })}
            </span>
            <button onClick={() => changeMonth(1)} className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded-full text-slate-600 transition">▶</button>
         </div>
         <button 
            onClick={() => window.print()} 
            className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition flex items-center gap-2"
         >
            🖨️ พิมพ์เอกสาร
         </button>
      </div>

      {/* --- หน้ากระดาษ A4 --- */}
      {/* ✅ แก้ไข: ใช้ w-[210mm] แค่ตอนดูหน้าจอ แต่ตอน print ให้ใช้ w-full เพื่อไม่ให้ล้น */}
      <div className="mx-auto bg-white shadow-2xl print:shadow-none w-[210mm] print:w-full min-h-[297mm] print:min-h-0 p-[15mm] print:p-0">
         
         {/* 1. Header หัวกระดาษ */}
         <div className="flex justify-between items-start mb-8">
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white text-2xl font-bold print:border print:border-slate-300">
                    ส
                </div>
                <div>
                    <h1 className="text-xl font-extrabold text-slate-800">สนามแบดมินตัน สันติภาพ</h1>
                    <p className="text-xs text-slate-500">รายงานรายได้ประจำเดือน (Monthly Revenue Report)</p>
                </div>
            </div>
            <div className="text-right">
                <div className="text-sm font-bold text-slate-600">ประจำเดือน</div>
                <div className="text-lg font-extrabold text-blue-600">{format(currentDate, 'MMMM พ.ศ. yyyy', { locale: th })}</div>
            </div>
         </div>

         {/* 2. ตารางข้อมูล */}
         <div className="mb-8">
             <table className="w-full text-left border-collapse border border-slate-300 text-sm">
                 <thead>
                     <tr className="bg-slate-100 text-slate-700">
                         <th className="border border-slate-300 px-4 py-2 w-16 text-center">ลำดับ</th>
                         <th className="border border-slate-300 px-4 py-2 text-center">วันที่</th>
                         <th className="border border-slate-300 px-4 py-2 w-1/3">รายการ</th>
                         <th className="border border-slate-300 px-4 py-2 text-center">จำนวน (รายการ)</th>
                         <th className="border border-slate-300 px-4 py-2 text-right">จำนวนเงิน (บาท)</th>
                     </tr>
                 </thead>
                 <tbody>
                     {dailyReport.length > 0 ? (
                         dailyReport.map((day, index) => (
                             <tr key={day.day}>
                                 <td className="border border-slate-300 px-4 py-2 text-center">{index + 1}</td>
                                 <td className="border border-slate-300 px-4 py-2 text-center">
                                     {format(new Date(day.date), 'dd/MM/yyyy')}
                                 </td>
                                 <td className="border border-slate-300 px-4 py-2">
                                     ค่าบริการสนามแบดมินตัน
                                 </td>
                                 <td className="border border-slate-300 px-4 py-2 text-center">
                                     {day.count}
                                 </td>
                                 <td className="border border-slate-300 px-4 py-2 text-right font-medium">
                                     {day.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                 </td>
                             </tr>
                         ))
                     ) : (
                         <tr>
                             <td colSpan={5} className="border border-slate-300 px-4 py-8 text-center text-slate-400 italic">
                                 -- ไม่มีข้อมูลรายได้ในเดือนนี้ --
                             </td>
                         </tr>
                     )}
                 </tbody>
                 <tfoot>
                     <tr className="bg-slate-50 font-bold text-slate-800">
                         <td colSpan={3} className="border border-slate-300 px-4 py-2 text-center">รวมทั้งสิ้น (Total)</td>
                         <td className="border border-slate-300 px-4 py-2 text-center">{totalBookings}</td>
                         <td className="border border-slate-300 px-4 py-2 text-right text-blue-600 text-lg">
                             {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                         </td>
                     </tr>
                 </tfoot>
             </table>
         </div>

         {/* 3. สรุปท้ายกระดาษ */}
         {/* ✅ ใช้ break-inside-avoid เพื่อป้องกันไม่ให้ส่วนสรุปขาดครึ่งหน้า */}
         <div className="flex justify-end mb-16 break-inside-avoid">
             <div className="w-1/2">
                 <div className="flex justify-between mb-2 text-sm">
                     <span className="text-slate-600">เงินสด (Cash):</span>
                     <span className="font-medium">0.00</span>
                 </div>
                 <div className="flex justify-between mb-2 text-sm">
                     <span className="text-slate-600">เงินโอน (Transfer):</span>
                     <span className="font-medium">{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                 </div>
                 <div className="flex justify-between mb-2 text-sm">
                     <span className="text-slate-600">ภาษีมูลค่าเพิ่ม (VAT 7%):</span>
                     <span className="font-medium">-</span> 
                 </div>
                 <div className="border-t border-slate-300 mt-2 pt-2 flex justify-between font-bold text-base">
                     <span>รวมสุทธิ:</span>
                     <span className="text-blue-700">{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} บาท</span>
                 </div>
             </div>
         </div>

         {/* 4. ส่วนเซ็นชื่อ */}
         <div className="flex justify-between text-center px-10 text-sm break-inside-avoid">
             <div className="flex flex-col items-center">
                 <div className="mb-8">จัดทำโดย</div>
                 <div className="w-40 border-b border-slate-400 border-dotted mb-2"></div>
                 <div className="text-slate-500">(.......................................................)</div>
                 <div className="mt-1 font-bold text-slate-700">เจ้าหน้าที่สนาม</div>
                 <div className="text-[10px] text-slate-400 mt-1">วันที่ ...../...../..........</div>
             </div>

             <div className="flex flex-col items-center">
                 <div className="mb-8">ผู้อนุมัติ</div>
                 <div className="w-40 border-b border-slate-400 border-dotted mb-2"></div>
                 <div className="text-slate-500">(.......................................................)</div>
                 <div className="mt-1 font-bold text-slate-700">ผู้จัดการ / เจ้าของกิจการ</div>
                 <div className="text-[10px] text-slate-400 mt-1">วันที่ ...../...../..........</div>
             </div>
         </div>

         <div className="mt-16 text-right text-[10px] text-slate-400">
             พิมพ์เมื่อ: {format(new Date(), 'd MMMM yyyy เวลา HH:mm น.', { locale: th })}
         </div>

      </div>
    </div>
  );
}