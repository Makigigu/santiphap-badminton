'use client';

import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Cell 
} from 'recharts';

// Types
type Booking = {
  id: string;
  customerName: string;
  phoneNumber: string;
  date: string;
  startTime: string;
  status: string;
  price: number;
  slipUrl: string | null;
  createdAt: string;
  court: { name: string };
};

type Court = { 
    id: number; 
    name: string; 
    closures: { startDate: string; endDate: string }[] 
};

// Type สำหรับรายการที่รวมกลุ่มแล้ว
type GroupedBooking = Booking & {
    ids: string[];        // เก็บ ID ทั้งหมดในกลุ่ม
    totalPrice: number;   // ราคารวม
    timeSlots: string[];  // เวลาทั้งหมด
    courtNames: string[]; // ชื่อสนามทั้งหมด
};

const timeSlots = [
  "08:00", "09:00", "10:00",
  "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"
];

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];
const currentY = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 7 }, (_, i) => currentY - 3 + i);

export default function DashboardPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlip, setSelectedSlip] = useState<string | null>(null);

  // Revenue Analytics State
  const [period, setPeriod] = useState<'daily' | 'monthly' | 'yearly'>('daily');
  const [chartYear, setChartYear] = useState<number>(new Date().getFullYear());
  const [chartMonth, setChartMonth] = useState<number>(new Date().getMonth());
  const [chartData, setChartData] = useState<{
    totalRevenue: number;
    totalBookings: number;
    averageRevenue?: number;
    monthLabel?: string;
    yearLabel?: string;
    data: { name: string; label: string; revenue: number; count: number }[];
  } | null>(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const todayStr = format(new Date(), 'yyyy-MM-dd'); 

  const fetchData = async () => {
    try {
        const [bookingsRes, courtsRes] = await Promise.all([
            fetch('/api/bookings?includeSlip=true', { cache: 'no-store' }),
            fetch('/api/courts', { cache: 'no-store' })
        ]);

        if (bookingsRes.ok && courtsRes.ok) {
            setBookings(await bookingsRes.json());
            setCourts(await courtsRes.json());
        }
    } catch (error) {
        console.error(error);
    } finally {
        setLoading(false);
    }
  };

  const fetchChartData = async () => {
    setChartLoading(true);
    try {
      const res = await fetch(`/api/revenue?period=${period}&year=${chartYear}&month=${chartMonth}`);
      if (res.ok) {
        setChartData(await res.json());
      }
    } catch (error) {
      console.error("Fetch chart error:", error);
    } finally {
      setChartLoading(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    fetchData();
  }, []);

  useEffect(() => {
    fetchChartData();
  }, [period, chartYear, chartMonth]);

  // ฟังก์ชันอนุมัติแบบกลุ่ม (ทีเดียวหลาย ID)
  const updateGroupStatus = async (ids: string[], status: string) => {
    const action = status === 'APPROVED' ? 'อนุมัติ' : 'ปฏิเสธ';
    if(!confirm(`ยืนยันการ "${action}" ยอดรวมนี้ทั้งหมด?`)) return;
    
    const newStatus = status === 'APPROVED' ? 'APPROVED' : 'REJECTED'; // ตรวจสอบสถานะให้ตรง Database

    try {
        // ยิง API วนลูปอัปเดตทุก ID ในกลุ่ม (ใช้ Promise.all เพื่อความเร็ว)
        await Promise.all(ids.map(id => 
            fetch('/api/bookings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status: newStatus })
            })
        ));
        
        alert("ทำรายการสำเร็จ");
        fetchData(); 
    } catch (error) {
        console.error(error);
        alert("เกิดข้อผิดพลาด");
    }
  };

  // ฟังก์ชันล้างรายการค้าง
  const handleCleanup = async () => {
    if(!confirm('ยืนยันการลบ\nระบบจะลบรายการที่ "รอชำระเงิน" และค้างนานเกิน 30 นาทีทิ้งทั้งหมด')) return;
    
    setLoading(true); // หมุนติ้วๆ ระหว่างรอ
    try {
        const res = await fetch('/api/bookings/cleanup', {
            method: 'DELETE',
        });

        if (res.ok) {
            const data = await res.json();
            alert(`ล้างข้อมูลเรียบร้อย \nลบรายการขยะไปทั้งหมด: ${data.deletedCount} รายการ`);
            fetchData(); // โหลดข้อมูลใหม่ทันที
        } else {
            alert("เกิดข้อผิดพลาด ไม่สามารถล้างข้อมูลได้");
        }
    } catch (error) {
        console.error("Cleanup error:", error);
        alert("เชื่อมต่อ Server ไม่ได้");
    } finally {
        setLoading(false);
    }
  };

  // --- Logic Grouping (หัวใจสำคัญของการรวมยอด) ---
  const groupedPendingBookings = useMemo(() => {
      // 1. กรองเฉพาะรายการที่ต้องตรวจ (PAID_VERIFY หรือ PENDING)
      const rawPending = bookings.filter(b => b.status === 'PAID_VERIFY' || b.status === 'PENDING');
      
      const groups: { [key: string]: GroupedBooking } = {};

      rawPending.forEach(b => {
          // สร้าง Key การจัดกลุ่ม: "ชื่อลูกค้า-เบอร์-วันที่-สถานะ"
          // ถ้าข้อมูลตรงกันหมด จะถือว่าเป็นกลุ่มเดียวกัน
          const dateStr = format(new Date(b.date), 'yyyy-MM-dd');
          const groupKey = `${b.customerName}-${b.phoneNumber}-${dateStr}-${b.status}`;

          if (!groups[groupKey]) {
              // ถ้ายังไม่มีกลุ่มนี้ ให้สร้างใหม่
              groups[groupKey] = {
                  ...b,
                  ids: [b.id],
                  totalPrice: b.price,
                  timeSlots: [b.startTime],
                  courtNames: [b.court.name]
              };
          } else {
              // ถ้ามีกลุ่มแล้ว ให้บวกเพิ่มเข้าไป
              groups[groupKey].ids.push(b.id);
              groups[groupKey].totalPrice += b.price; // บวกเงินเพิ่ม
              groups[groupKey].timeSlots.push(b.startTime); // เพิ่มเวลา
              if (!groups[groupKey].courtNames.includes(b.court.name)) {
                  groups[groupKey].courtNames.push(b.court.name); // เพิ่มชื่อสนาม (ถ้าไม่ซ้ำ)
              }
              // ถ้าอันใหม่มีสลิป แต่อันเก่าไม่มี ให้อัปเดตสลิป (เผื่อบางอันลืมแนบ)
              if (b.slipUrl && !groups[groupKey].slipUrl) {
                  groups[groupKey].slipUrl = b.slipUrl;
              }
          }
      });

      // แปลง Object กลับเป็น Array เพื่อเอาไปวนลูปแสดงผล
      return Object.values(groups).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  }, [bookings]);

  
  // คำนวณรายได้วันนี้
  const todayIncome = bookings
    .filter(b => (b.status === 'APPROVED' || b.status === 'COMPLETED') && format(new Date(b.date), 'yyyy-MM-dd') === todayStr)
    .reduce((a, b) => a + b.price, 0);

  // Logic เช็คสถานะสนาม (Real-time)
  const getSlotStatus = (court: Court, timeStart: string) => {
      const isClosedToday = court.closures?.some(closure => {
          const start = format(new Date(closure.startDate), 'yyyy-MM-dd');
          const end = format(new Date(closure.endDate), 'yyyy-MM-dd');
          return todayStr >= start && todayStr <= end;
      });

      if (isClosedToday) return 'maintenance';

      const booking = bookings.find(b => 
          format(new Date(b.date), 'yyyy-MM-dd') === todayStr && 
          b.court.name === court.name &&
          b.startTime.includes(timeStart) && 
          b.status !== 'rejected' && b.status !== 'REJECTED' &&
          b.status !== 'cancelled' && b.status !== 'CANCELLED'
      );
      
      // แปลง status เป็น lowercase เพื่อให้ switch case ทำงานง่าย
      return booking ? booking.status.toLowerCase() : 'free';
  };

  const formatCourtName = (name: string) => name.replace('COURT', 'สนาม');

  if (loading) return <div className="p-10 text-center text-slate-500 font-bold">กำลังโหลดข้อมูล...</div>;

  return (
    <div className="animate-fade-in space-y-8 relative p-6">
       
       {/* Modal ดูรูปสลิป */}
       {selectedSlip && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setSelectedSlip(null)}>
           <div className="relative max-w-lg w-full bg-white rounded-xl overflow-hidden shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
             <div className="p-4 border-b flex justify-between items-center">
               <h3 className="font-bold text-lg">หลักฐานการโอนเงิน</h3>
               <button onClick={() => setSelectedSlip(null)} className="text-slate-500 hover:text-red-500 font-bold text-xl">×</button>
             </div>
             <div className="p-4 flex justify-center bg-slate-100">
               <img src={selectedSlip} alt="Slip" className="max-h-[70vh] object-contain rounded-md" />
             </div>
           </div>
         </div>
       )}

       {/* Stats Cards */}
       <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <p className="text-slate-500 text-xs font-bold uppercase">รายได้วันนี้</p>
                <h3 className="text-3xl font-extrabold text-green-600 mt-2">{todayIncome.toLocaleString()} ฿</h3>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <p className="text-slate-500 text-xs font-bold uppercase">รอตรวจสอบ</p>
                <h3 className="text-3xl font-extrabold text-orange-500 mt-2">
                    {/* นับจำนวนกลุ่มแทนจำนวนรายการเดี่ยว */}
                    {groupedPendingBookings.filter(b => b.status === 'PAID_VERIFY').length} รายการ (กลุ่ม)
                </h3>
            </div>
       </div>

       {/* Revenue Analytics Chart Section */}
       <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                        <span>📊</span> สถิติรายได้ (Revenue Analytics)
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                        คำนวณจากรายการที่อนุมัติและชำระเงินสำเร็จแล้ว
                    </p>
                </div>

                {/* Period & Filter Controls */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* Period Tabs */}
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button
                            onClick={() => setPeriod('daily')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                                period === 'daily' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            📅 รายวัน
                        </button>
                        <button
                            onClick={() => setPeriod('monthly')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                                period === 'monthly' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            📆 รายเดือน
                        </button>
                        <button
                            onClick={() => setPeriod('yearly')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                                period === 'yearly' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            📈 รายปี
                        </button>
                    </div>

                    {/* Month Filter (for daily view) */}
                    {period === 'daily' && (
                        <select
                            value={chartMonth}
                            onChange={(e) => setChartMonth(parseInt(e.target.value))}
                            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none cursor-pointer hover:bg-slate-100 transition"
                        >
                            {THAI_MONTHS.map((m, idx) => (
                                <option key={idx} value={idx}>{m}</option>
                            ))}
                        </select>
                    )}

                    {/* Year Filter (for daily and monthly view) */}
                    {(period === 'daily' || period === 'monthly') && (
                        <select
                            value={chartYear}
                            onChange={(e) => setChartYear(parseInt(e.target.value))}
                            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none cursor-pointer hover:bg-slate-100 transition"
                        >
                            {YEAR_OPTIONS.map((y) => (
                                <option key={y} value={y}>{y + 543}</option>
                            ))}
                        </select>
                    )}
                </div>
            </div>

            {/* Summary Stat Badges */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                    <span className="text-[11px] font-bold text-slate-500 block">รายได้รวมช่วงนี้</span>
                    <span className="text-xl md:text-2xl font-extrabold text-blue-600">
                        {chartData ? chartData.totalRevenue.toLocaleString() : 0} ฿
                    </span>
                </div>
                <div>
                    <span className="text-[11px] font-bold text-slate-500 block">จำนวนการจองสำเร็จ</span>
                    <span className="text-xl md:text-2xl font-extrabold text-slate-800">
                        {chartData ? chartData.totalBookings.toLocaleString() : 0} รอบ
                    </span>
                </div>
                <div className="col-span-2 md:col-span-1">
                    <span className="text-[11px] font-bold text-slate-500 block">
                        {period === 'daily' ? 'เฉลี่ยต่อวัน (เฉพาะวันมีรายได้)' : period === 'monthly' ? 'เฉลี่ยต่อเดือน' : 'ช่วงเวลา'}
                    </span>
                    <span className="text-xl md:text-2xl font-extrabold text-emerald-600">
                        {chartData && chartData.averageRevenue ? `${chartData.averageRevenue.toLocaleString()} ฿` : '-'}
                    </span>
                </div>
            </div>

            {/* Chart Area */}
            <div className="h-72 w-full">
                {!isMounted || chartLoading ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-xs font-bold">กำลังประมวลผลข้อมูลกราฟ...</span>
                    </div>
                ) : chartData && chartData.data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData.data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis 
                                dataKey="name" 
                                tickLine={false} 
                                axisLine={{ stroke: '#e2e8f0' }}
                                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                            />
                            <YAxis 
                                tickLine={false} 
                                axisLine={false}
                                tick={{ fill: '#94a3b8', fontSize: 11 }}
                                tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
                            />
                            <Tooltip content={({ active, payload, label }: any) => {
                                if (active && payload && payload.length) {
                                    const d = payload[0].payload;
                                    return (
                                        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs">
                                            <p className="font-bold text-slate-200 mb-1">{d.label || `วันที่ ${label}`}</p>
                                            <p className="text-emerald-400 font-extrabold text-sm">
                                                ฿{Number(d.revenue).toLocaleString()}
                                            </p>
                                            <p className="text-slate-400 mt-0.5">จองสำเร็จ: {d.count} รอบ</p>
                                        </div>
                                    );
                                }
                                return null;
                            }} />
                            <Bar 
                                dataKey="revenue" 
                                radius={[6, 6, 0, 0]}
                                fill="#3b82f6"
                            >
                                {chartData.data.map((entry, index) => (
                                    <Cell 
                                        key={`cell-${index}`} 
                                        fill={entry.revenue > 0 ? '#3b82f6' : '#e2e8f0'} 
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 text-sm italic">
                        -- ไม่พบข้อมูลรายได้ในช่วงเวลานี้ --
                    </div>
                )}
            </div>
       </div>

       {/* Pending Table (แบบรวมกลุ่ม) */}
       <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-orange-50/50">
                <h2 className="text-lg font-extrabold text-slate-800">รายการล่าสุด (รอตรวจสอบ & รอโอน)</h2>
                
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleCleanup} 
                        className="text-xs bg-red-100 text-red-600 px-3 py-1.5 rounded-full font-bold hover:bg-red-200 transition flex items-center gap-1"
                    >
                        <span></span> ล้างรายการค้าง
                    </button>
                    <button onClick={fetchData} className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1">
                        <span></span> รีเฟรช
                    </button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                        <tr>
                            <th className="p-4">เวลาจอง</th>
                            <th className="p-4">ลูกค้า</th>
                            <th className="p-4">รายละเอียดการจอง</th>
                            <th className="p-4">สถานะ</th>
                            <th className="p-4">ยอดรวม</th>
                            <th className="p-4">หลักฐาน</th>
                            <th className="p-4 text-center">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {groupedPendingBookings.length === 0 ? (
                            <tr><td colSpan={7} className="p-8 text-center text-slate-400">ไม่มีรายการค้าง</td></tr>
                        ) : (
                            groupedPendingBookings.map(group => (
                                <tr key={group.id} className="hover:bg-slate-50">
                                    <td className="p-4 text-slate-500">
                                        {format(new Date(group.date), "d MMM", { locale: th })}
                                        <br/>
                                        <span className="text-xs text-slate-400">({format(new Date(group.createdAt), "HH:mm")})</span>
                                    </td>
                                    <td className="p-4">
                                        <div className="font-bold text-slate-800">{group.customerName}</div>
                                        <div className="text-xs text-slate-400">{group.phoneNumber}</div>
                                    </td>
                                    <td className="p-4">
                                        {/* แสดงชื่อสนามและเวลาที่รวมมาแล้ว */}
                                        <div className="font-bold text-blue-600 mb-1">
                                            {group.courtNames.map(formatCourtName).join(', ')}
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {group.timeSlots.sort().map((t, i) => (
                                                <span key={i} className="bg-slate-100 px-2 py-0.5 rounded text-xs text-slate-600 font-medium whitespace-nowrap">
                                                    {t} น.
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        {group.status === 'PAID_VERIFY' ? (
                                            <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-bold border border-yellow-200 inline-flex items-center gap-1">
                                                <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
                                                รอตรวจ ({group.ids.length})
                                            </span>
                                        ) : (
                                            <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-bold border border-red-200">
                                                รอโอน ({group.ids.length})
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <div className="text-green-600 font-extrabold text-lg">{group.totalPrice.toLocaleString()}.-</div>
                                    </td>
                                    <td className="p-4">
                                        {group.slipUrl ? (
                                            <button onClick={() => setSelectedSlip(group.slipUrl)} className="text-blue-600 underline hover:text-blue-800 font-medium text-xs">
                                                📄 ดูสลิป
                                            </button>
                                        ) : <span className="text-slate-300 text-xs">-</span>}
                                    </td>
                                    <td className="p-4 text-center flex justify-center gap-2">
                                        {group.status === 'PAID_VERIFY' && (
                                            <button onClick={() => updateGroupStatus(group.ids, 'APPROVED')} className="bg-green-600 text-white px-3 py-1.5 rounded text-xs hover:bg-green-700 transition shadow-sm font-bold">
                                                อนุมัติทั้งหมด
                                            </button>
                                        )}
                                        <button onClick={() => updateGroupStatus(group.ids, 'REJECTED')} className="bg-white text-red-500 px-3 py-1.5 rounded text-xs border border-red-200 hover:bg-red-50 transition">
                                            ยกเลิก
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
       </div>

       {/* Real-time Schedule */}
       <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-extrabold text-slate-800 mb-4">ตารางจองวันนี้ ({format(new Date(), "d MMM yyyy", { locale: th })})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {(courts || []).map(court => (
                    <div key={court.id} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="bg-slate-50 p-3 font-bold text-sm text-center border-b border-slate-100">{formatCourtName(court.name)}</div>
                        <div className="p-2 space-y-1 bg-white h-64 overflow-y-auto">
                            {timeSlots.map(time => {
                                const status = getSlotStatus(court, time);
                                
                                let style = "bg-green-50 text-green-700 border-green-100 hover:bg-green-100";
                                let text = "ว่าง";

                                if (status === 'approved' || status === 'completed') {
                                    style = "bg-slate-800 text-white border-slate-800";
                                    text = "เต็ม";
                                } 
                                else if (status === 'pending') {
                                    style = "bg-red-100 text-red-600 border-red-200";
                                    text = "จอง (รอโอน)";
                                }
                                else if (status === 'paid_verify') {
                                    style = "bg-yellow-100 text-yellow-700 border-yellow-200 ring-1 ring-yellow-300";
                                    text = "รอตรวจ";
                                }
                                else if (status === 'maintenance') { 
                                    style = "bg-gray-100 text-gray-400 border-gray-200";
                                    text = "ปิด";
                                }

                                return (
                                    <div key={time} className={`text-xs py-1.5 px-2 rounded font-medium border flex justify-between items-center transition-colors ${style}`}>
                                        <span>{time}</span>
                                        <span className="text-[10px]">{text}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>
       </div>
    </div>
  );
}