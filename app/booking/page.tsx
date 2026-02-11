'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

// --- Types ---
type CourtClosure = {
  id: number;
  startDate: string;
  endDate: string;
};

type Court = {
  id: number;
  name: string;
  type: string;
  price: number;
  closures: CourtClosure[];
};

type ExistingBooking = {
  id: string;
  courtId: number;
  date: string;
  startTime: string;
  status: string;
  customerName: string;
};

type BookingSlot = {
  courtId: number;
  timeIndex: number;
  status: 'free' | 'busy' | 'passed'; 
  bookedBy?: string;
};

const timeSlots = [
  "11:00-12:00", "12:00-13:00", "13:00-14:00", "14:00-15:00", 
  "15:00-16:00", "16:00-17:00", "17:00-18:00", "18:00-19:00", 
  "19:00-20:00", "20:00-21:00", "21:00-22:00"
];

export default function BookingPage() {
  const router = useRouter();
  
  const [courts, setCourts] = useState<Court[]>([]);
  const [existingBookings, setExistingBookings] = useState<ExistingBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const [selectedDate, setSelectedDate] = useState<string>('');
  const [minDate, setMinDate] = useState<string>('');
  const [displayDateThai, setDisplayDateThai] = useState('');
  
  // Selection State
  const [selectedSlots, setSelectedSlots] = useState<{courtId: number, timeIndex: number}[]>([]);
  
  // Modal State (เพิ่มตัวนี้มาคุมการเปิดปิดฟอร์ม)
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [filterCourtId, setFilterCourtId] = useState<string>('all');
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  async function fetchLatestData() {
    try {
      const [courtsRes, bookingsRes] = await Promise.all([
         fetch('/api/courts', { cache: 'no-store' }),
         fetch('/api/bookings', { cache: 'no-store' })
      ]);
      
      if (courtsRes.ok) setCourts(await courtsRes.json());
      if (bookingsRes.ok) setExistingBookings(await bookingsRes.json());
      return true;
    } catch (error) {
      console.error("Error:", error);
      return false;
    }
  }

  useEffect(() => {
    async function init() {
        await fetchLatestData();
        setLoading(false);
    }
    init();

    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const localDateString = `${year}-${month}-${day}`;
    
    setSelectedDate(localDateString); 
    setMinDate(localDateString);      
  }, []);

  const dailySchedule = useMemo(() => {
    if (!selectedDate || courts.length === 0) return [];

    const schedule: BookingSlot[] = [];
    const now = new Date();
    const currentHour = now.getHours();
    const todayStr = format(now, 'yyyy-MM-dd');

    courts.forEach(court => {
        timeSlots.forEach((slotTime, timeIndex) => {
            const slotStartHour = parseInt(slotTime.split(':')[0]); 
            let status: 'free' | 'busy' | 'passed' = 'free';
            let bookedBy = undefined;

            const bookingFound = existingBookings.find(b => {
                const bookingDate = format(new Date(b.date), 'yyyy-MM-dd');
                const isTimeMatch = b.startTime.includes(slotTime) || 
                                    parseInt(b.startTime.split(':')[0]) === slotStartHour;

                return bookingDate === selectedDate &&      
                       b.courtId === court.id &&            
                       isTimeMatch &&                       
                       b.status !== 'rejected' && b.status !== 'cancelled';             
            });

            if (bookingFound) {
                status = 'busy';
                bookedBy = bookingFound.customerName;
            } 
            else if (selectedDate === todayStr && slotStartHour <= currentHour) {
                status = 'passed';
            }

            schedule.push({
                courtId: court.id,
                timeIndex: timeIndex,
                status: status,
                bookedBy: bookedBy
            });
        });
    });
    return schedule;
  }, [selectedDate, courts, existingBookings]); 

  const getStatus = (courtId: number, timeIndex: number) => {
      return dailySchedule.find(s => s.courtId === courtId && s.timeIndex === timeIndex);
  };

  useEffect(() => {
    if (selectedDate) {
        const dateObj = new Date(selectedDate);
        const buddhistYear = dateObj.getFullYear() + 543;
        setDisplayDateThai(format(dateObj, "EEEEที่ dd MMMM", { locale: th }) + " " + buddhistYear);
        setSelectedSlots([]); 
        setShowConfirmModal(false); // ปิด Modal เมื่อเปลี่ยนวัน
    }
  }, [selectedDate]);

  const handleSlotClick = (courtId: number, timeIndex: number, status: string) => {
      if (status === 'busy' || status === 'passed') return; 
      
      const isSelected = selectedSlots.some(s => s.courtId === courtId && s.timeIndex === timeIndex);
      if (isSelected) {
          setSelectedSlots(prev => prev.filter(s => !(s.courtId === courtId && s.timeIndex === timeIndex)));
      } else {
          setSelectedSlots(prev => [...prev, { courtId, timeIndex }]);
      }
  };

  const displayedCourts = filterCourtId === 'all' 
    ? courts 
    : courts.filter(c => c.id === parseInt(filterCourtId));

  const totalPrice = selectedSlots.reduce((sum, slot) => {
      const court = courts.find(c => c.id === slot.courtId);
      return sum + (court ? court.price : 0);
  }, 0);

  const handleConfirmBooking = async () => {
      if (!customerName.trim()) { alert("กรุณากรอกชื่อลูกค้า"); return; }
      if (!phoneNumber.trim()) { alert("กรุณากรอกเบอร์โทรศัพท์"); return; }
      if (phoneNumber.length < 9) { alert("กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง"); return; }

      setIsProcessing(true);

      try {
        const bookingPromises = selectedSlots.map(slot => {
            const timeString = timeSlots[slot.timeIndex];
            const court = courts.find(c => c.id === slot.courtId);
            const price = court ? court.price : 0;

            return fetch('/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerName,
                    phoneNumber,
                    date: selectedDate,
                    startTime: timeString,
                    price: price,
                    courtId: slot.courtId
                })
            });
        });

        const responses = await Promise.all(bookingPromises);
        
        let hasError = false;
        let isConflict = false;
        const successfulBookingIds: number[] = [];

        for (const res of responses) {
            if (!res.ok) {
                hasError = true;
                if (res.status === 409) isConflict = true;
            } else {
                const data = await res.json();
                if (data.id) {
                    successfulBookingIds.push(data.id);
                }
            }
        }

        if (hasError) {
             if (isConflict) {
                 alert("⚠️ เสียใจด้วย! มีบางช่วงเวลาถูกจองตัดหน้าไปแล้ว");
             } else {
                 alert("เกิดข้อผิดพลาดในการจอง กรุณาลองใหม่อีกครั้ง");
             }
             await fetchLatestData(); 
             setSelectedSlots([]);
             setShowConfirmModal(false);
             setIsProcessing(false);
             return;
        }

        const bookingDetails = {
            id: `BK-GROUP-${Date.now()}`, 
            bookingIds: successfulBookingIds, 
            customerName, 
            phoneNumber,
            date: displayDateThai,
            price: totalPrice,
            courtName: selectedSlots.map(s => {
               const c = courts.find(court => court.id === s.courtId);
               return c ? c.name.replace('COURT', 'สนาม') : '';
            }).join(', '), 
            time: selectedSlots.map(s => timeSlots[s.timeIndex] + " น.").join(', '),
            status: 'pending',
        };

        localStorage.setItem('tempBooking', JSON.stringify(bookingDetails));
        router.push(`/payment?price=${totalPrice}&count=${selectedSlots.length}`);
        
      } catch (error) {
          console.error(error);
          alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
          setIsProcessing(false);
      }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-slate-500">กำลังโหลดข้อมูล...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-32"> {/* เพิ่ม Padding ล่างเผื่อพื้นที่ให้ Sticky Bar */}
      
      <nav className="bg-white shadow-sm sticky top-0 z-20 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 text-slate-600 font-bold hover:text-slate-900 transition bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-full">
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
             <span>กลับหน้าหลัก</span>
          </Link>
          <Link href="/history" className="flex items-center gap-2 text-blue-600 font-bold transition px-4 py-2 rounded-full hover:bg-blue-50">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              <span className="hidden sm:inline">ประวัติการจอง</span>
          </Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 mb-8">
            <h1 className="text-3xl font-extrabold text-center mb-8 text-slate-800">ค้นหาคอร์ท</h1>
            <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                <div>
                    <label className="block text-sm font-bold text-slate-500 mb-2 pl-1">เลือกวันที่</label>
                    <input type="date" value={selectedDate} min={minDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-medium shadow-sm" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-500 mb-2 pl-1">เลือกคอร์ท</label>
                    <select value={filterCourtId} onChange={(e) => setFilterCourtId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-medium shadow-sm cursor-pointer">
                        <option value="all">แสดงทุกคอร์ท</option>
                        {courts.map(c => (
                            <option key={c.id} value={c.id}>{c.name.replace('COURT', 'สนาม')} ({c.type})</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>

        {/* Legend */}
        <div className="text-center mb-6">
            <div className="text-3xl font-extrabold text-slate-800 mb-4 drop-shadow-sm">{displayDateThai}</div>
            <div className="flex flex-wrap justify-center gap-4 md:gap-6 text-xs md:text-sm font-bold">
                <div className="flex items-center gap-2"><div className="w-4 h-4 bg-green-400 rounded shadow-sm"></div><span className="text-slate-700">ว่าง</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 bg-red-500 rounded shadow-sm"></div><span className="text-slate-700">ไม่ว่าง</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 bg-yellow-400 rounded shadow-sm ring-2 ring-blue-500"></div><span className="text-slate-700">ที่เลือกไว้</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-4 bg-slate-200 rounded shadow-sm"></div><span className="text-slate-400">ปิด/ผ่านไปแล้ว</span></div>
            </div>
        </div>

        {/* Grid แสดงสนาม */}
        <div className="overflow-x-auto pb-6">
            <div className={`min-w-[1000px] grid gap-4 px-1 ${displayedCourts.length === 1 ? 'grid-cols-1 max-w-md mx-auto' : 'grid-cols-6'}`}>
                {displayedCourts.map((court) => {
                    const isClosedMaintenance = court.closures?.some(closure => {
                        const start = format(new Date(closure.startDate), 'yyyy-MM-dd');
                        const end = format(new Date(closure.endDate), 'yyyy-MM-dd');
                        return selectedDate >= start && selectedDate <= end;
                    });

                    return (
                        <div key={court.id} className={`bg-white rounded-t-xl overflow-hidden border border-slate-200 shadow-md relative ${isClosedMaintenance ? 'opacity-60 pointer-events-none' : ''}`}>
                            
                            {isClosedMaintenance && (
                                <div className="absolute inset-0 z-20 bg-slate-100/90 flex flex-col items-center justify-center text-slate-500">
                                    <span className="text-3xl mb-2">🛠️</span>
                                    <span className="font-bold text-lg">ปิดปรับปรุง</span>
                                </div>
                            )}

                            <div className="bg-white p-3 border-b border-slate-100 flex justify-between items-center">
                                <div>
                                    <span className="font-extrabold text-slate-800 text-base block">{court.name.replace('COURT', 'สนาม')}</span>
                                    <span className="text-[11px] text-slate-600 font-bold block mt-0.5">{court.type}</span>
                                    <span className="text-[10px] text-blue-600 font-bold">฿{court.price}/ชม.</span>
                                </div>
                            </div>
                            <div className="divide-y divide-slate-100 bg-slate-50">
                                {timeSlots.map((time, index) => {
                                    const slotData = getStatus(court.id, index);
                                    const status = slotData?.status || 'free';
                                    const isSelected = selectedSlots.some(s => s.courtId === court.id && s.timeIndex === index);

                                    let bgClass = 'bg-green-300 hover:bg-green-400 cursor-pointer'; 
                                    let cursorClass = 'cursor-pointer';
                                    
                                    if (status === 'busy') {
                                        bgClass = 'bg-red-500 text-white border-red-600';
                                        cursorClass = 'cursor-not-allowed';
                                    } else if (status === 'passed') {
                                        bgClass = 'bg-slate-100 text-slate-400'; 
                                        cursorClass = 'cursor-not-allowed';
                                    } else if (isSelected) {
                                        bgClass = 'bg-yellow-300 ring-2 ring-inset ring-blue-600 z-10';
                                    }

                                    return (
                                        <div 
                                            key={index} 
                                            onClick={() => !isClosedMaintenance && handleSlotClick(court.id, index, status)}
                                            className={`p-2.5 h-12 flex items-center justify-between text-xs font-bold transition-all duration-150 ${bgClass} ${cursorClass}`}
                                        >
                                            <span className={status === 'busy' ? 'text-white' : status === 'passed' ? 'text-slate-400' : 'text-slate-800'}>
                                                {time} น.
                                            </span>
                                            {status === 'busy' ? (
                                                <span className="text-[10px] bg-black/20 px-1.5 py-0.5 rounded truncate max-w-[80px]">
                                                    {slotData?.bookedBy}
                                                </span>
                                            ) : isSelected ? (
                                                <span className="text-blue-700 text-lg">✓</span>
                                            ) : status === 'passed' ? (
                                                <span className="text-[10px]">ปิด</span>
                                            ) : (
                                                <div className="w-5 h-3 border border-slate-600/30 opacity-40"></div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* ✅ Sticky Bottom Bar (แถบสรุปด้านล่าง ไม่บังจอ) */}
        {selectedSlots.length > 0 && !showConfirmModal && (
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] p-4 z-40 animate-slide-up">
               <div className="max-w-2xl mx-auto flex justify-between items-center">
                  <div className="flex flex-col">
                     <span className="text-xs text-slate-500 font-bold">รายการที่เลือก</span>
                     <div className="flex items-baseline gap-2">
                        <span className="text-xl font-extrabold text-blue-600">{selectedSlots.length}</span>
                        <span className="text-sm text-slate-600">รายการ</span>
                        <span className="text-lg font-bold text-slate-800 ml-2">{totalPrice.toLocaleString()} บาท</span>
                     </div>
                  </div>

                  <button 
                    onClick={() => setShowConfirmModal(true)} 
                    className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition"
                  >
                    ดำเนินการต่อ
                  </button>
               </div>
            </div>
        )}

        {/* ✅ Modal ยืนยันการจอง (แสดงเมื่อกดปุ่มดำเนินการต่อเท่านั้น) */}
        {showConfirmModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 max-w-lg w-full relative max-h-[90vh] overflow-y-auto animate-scale-in">
                    
                    <div className="flex justify-between items-center mb-6 border-b pb-4">
                        <h2 className="text-2xl font-extrabold text-slate-800">ยืนยันการจอง</h2>
                        <button onClick={() => setShowConfirmModal(false)} className="bg-slate-100 hover:bg-slate-200 p-2 rounded-full text-slate-500 hover:text-red-500 transition">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>

                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-slate-500 text-sm">วันที่:</span>
                            <span className="text-slate-800 font-bold">{displayDateThai}</span>
                        </div>
                        <div className="space-y-2 mb-3 max-h-40 overflow-y-auto pr-1">
                            {selectedSlots.map((slot, idx) => {
                                const c = courts.find(c => c.id === slot.courtId);
                                return (
                                    <div key={idx} className="flex justify-between items-center text-sm bg-white p-2 rounded border border-blue-100">
                                        <span className="text-slate-700 font-medium">{c?.name.replace('COURT', 'สนาม')} ({timeSlots[slot.timeIndex].split('-')[0]})</span>
                                        <span className="text-slate-800 font-bold">{c?.price}.-</span>
                                    </div>
                                )
                            })}
                        </div>
                        <div className="border-t border-blue-200 pt-3 flex justify-between items-center">
                            <span className="text-blue-800 font-bold">ราคารวม:</span>
                            <span className="text-blue-600 font-extrabold text-2xl">{totalPrice.toLocaleString()} บาท</span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-500 mb-1 pl-1">ชื่อลูกค้า <span className="text-red-500">*</span></label>
                            <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} disabled={isProcessing} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-medium" placeholder="ระบุชื่อผู้จอง" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-500 mb-1 pl-1">เบอร์โทร <span className="text-red-500">*</span></label>
                            <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} disabled={isProcessing} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-medium" placeholder="0xx-xxx-xxxx" />
                        </div>
                        
                        <div className="pt-2">
                            <button 
                                onClick={handleConfirmBooking} 
                                disabled={isProcessing}
                                className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all flex justify-center items-center gap-2
                                    ${isProcessing ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white active:scale-95'}
                                `}
                            >
                                {isProcessing ? "กำลังบันทึก..." : `ยืนยันการจอง (${totalPrice} บาท)`}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

      </main>
    </div>
  );
}