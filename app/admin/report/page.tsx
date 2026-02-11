'use client';

import { useState, useEffect, useMemo } from 'react';
import { format, parseISO, getDaysInMonth, startOfMonth, addMonths, subMonths } from 'date-fns';
import { th } from 'date-fns/locale';

type Booking = {
  id: string;
  date: string;
  price: number;
  status: string;
};

type DailyRevenue = {
  date: string;     // 2026-02-01
  day: number;      // 1
  count: number;    // จำนวนรายการ
  total: number;    // ยอดเงินรวม
};

export default function ReportPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // ดึงข้อมูลเมื่อเปลี่ยนเดือน
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

  // --- Logic คำนวณยอดรายวัน ---
  const dailyReport = useMemo(() => {
    const daysInMonth = getDaysInMonth(currentDate);
    const report: DailyRevenue[] = [];
    const monthStart = startOfMonth(currentDate);

    // วนลูปสร้างตาราง 1 ถึง วันสิ้นเดือน
    for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = format(new Date(monthStart.getFullYear(), monthStart.getMonth(), i), 'yyyy-MM-dd');
        
        // หา Booking ของวันนี้
        const daysBookings = bookings.filter(b => 
            format(new Date(b.date), 'yyyy-MM-dd') === dateStr
        );

        const total = daysBookings.reduce((sum, b) => sum + b.price, 0);

        report.push({
            date: dateStr,
            day: i,
            count: daysBookings.length,
            total: total
        });
    }
    return report;
  }, [bookings, currentDate]);

  // ยอดรวมทั้งเดือน
  const grandTotal = bookings.reduce((sum, b) => sum + b.price, 0);
  const totalBookings = bookings.length;

  const changeMonth = (amount: number) => {
      setCurrentDate(prev => addMonths(prev, amount));
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans text-slate-900 print:bg-white print:p-0">
      
      {/* --- ส่วนควบคุม (ไม่แสดงตอน Print) --- */}
      <div className="max-w-4xl mx-auto mb-8 flex justify-between items-center print:hidden">
         <div className="flex items-center gap-4">
            <button onClick={() => changeMonth(-1)} className="p-2 bg-white rounded-full shadow hover:bg-slate-100">◀</button>
            <h1 className="text-2xl font-bold text-slate-800">
                {format(currentDate, 'MMMM yyyy', { locale: th })}
            </h1>
            <button onClick={() => changeMonth(1)} className="p-2 bg-white rounded-full shadow hover:bg-slate-100">▶</button>
         </div>
         <button 
            onClick={() => window.print()} 
            className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition flex items-center gap-2"
         >
            🖨️ พิมพ์รายงาน
         </button>
      </div>

      {/* --- เอกสารรายงาน (A4 Style) --- */}
      <div className="max-w-4xl mx-auto bg-white p-10 rounded-3xl shadow-xl print:shadow-none print:w-full print:max-w-none">
         
         {/* Header เอกสาร */}
         <div className="text-center border-b-2 border-slate-800 pb-6 mb-6">
            <h1 className="text-3xl font-extrabold text-slate-900">สรุปรายได้ประจำเดือน</h1>
            <p className="text-lg text-slate-600 mt-2">
                สนามแบดมินตัน สันติภาพ จ.น่าน
            </p>
            <div className="mt-4 inline-block bg-slate-100 px-6 py-2 rounded-full border border-slate-200 print:bg-transparent print:border-0">
                <span className="font-bold text-xl text-blue-800">
                    ประจำเดือน {format(currentDate, 'MMMM พ.ศ. yyyy', { locale: th })}
                </span>
            </div>
         </div>

         {/* สรุปยอดรวม (Highlight) */}
         <div className="grid grid-cols-2 gap-6 mb-8">
             <div className="bg-green-50 p-6 rounded-2xl border border-green-100 text-center print:border-2 print:border-slate-300">
                 <p className="text-slate-500 font-bold text-sm uppercase">รายได้รวมทั้งสิ้น</p>
                 <p className="text-4xl font-extrabold text-green-700 mt-2">{grandTotal.toLocaleString()} บาท</p>
             </div>
             <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 text-center print:border-2 print:border-slate-300">
                 <p className="text-slate-500 font-bold text-sm uppercase">จำนวนการจอง (สำเร็จ)</p>
                 <p className="text-4xl font-extrabold text-blue-700 mt-2">{totalBookings} รายการ</p>
             </div>
         </div>

         {/* ตารางรายละเอียดรายวัน */}
         <div className="overflow-hidden rounded-xl border border-slate-200 print:border-2 print:border-slate-800">
             <table className="w-full text-left border-collapse">
                 <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-sm print:bg-slate-200">
                     <tr>
                         <th className="p-4 border-b border-slate-200 print:border-slate-800">วันที่</th>
                         <th className="p-4 border-b border-slate-200 print:border-slate-800 text-center">จำนวนการจอง</th>
                         <th className="p-4 border-b border-slate-200 print:border-slate-800 text-right">รายได้ (บาท)</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 print:divide-slate-300">
                     {dailyReport.map((day, index) => {
                         // ไฮไลท์เสาร์-อาทิตย์
                         const dateObj = new Date(day.date);
                         const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                         
                         return (
                             <tr key={day.day} className={`${isWeekend ? 'bg-slate-50/50 print:bg-slate-100' : ''} hover:bg-blue-50`}>
                                 <td className="p-3 pl-4 font-medium text-slate-700">
                                     {format(dateObj, 'd MMM (EEEE)', { locale: th })}
                                 </td>
                                 <td className="p-3 text-center text-slate-500">
                                     {day.count > 0 ? (
                                         <span className="font-bold text-slate-800">{day.count}</span>
                                     ) : '-'}
                                 </td>
                                 <td className="p-3 pr-4 text-right font-bold text-slate-800">
                                     {day.total > 0 ? day.total.toLocaleString() : <span className="text-slate-300">-</span>}
                                 </td>
                             </tr>
                         )
                     })}
                 </tbody>
                 <tfoot className="bg-slate-100 font-bold text-slate-800 border-t-2 border-slate-300 print:bg-slate-200">
                     <tr>
                         <td className="p-4 text-lg">รวมทั้งสิ้น</td>
                         <td className="p-4 text-center text-lg">{totalBookings}</td>
                         <td className="p-4 text-right text-lg">{grandTotal.toLocaleString()}.-</td>
                     </tr>
                 </tfoot>
             </table>
         </div>

         <div className="mt-10 text-center text-xs text-slate-400 print:block hidden">
             พิมพ์รายงานเมื่อ: {format(new Date(), 'd MMMM yyyy HH:mm น.', { locale: th })}
         </div>

      </div>
    </div>
  );
}