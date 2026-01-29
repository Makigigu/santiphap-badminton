'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

type Closure = {
  id?: number; // มี ? เพราะตอนเพิ่มใหม่ยังไม่มี ID
  startDate: string;
  endDate: string;
};

type Court = {
  id: number;
  name: string;
  type: string;
  price: number;
  closures: Closure[];
};

export default function SettingsPage() {
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);

  // State สำหรับเก็บข้อมูลฟอร์มปิดสนามใหม่ (แยกแต่ละสนามไม่ได้ เลยใช้ตัวแปรเดียวแล้วกดเพิ่มเอา)
  // แต่เพื่อให้ง่าย เราจะใช้ logic คือกดเพิ่มแล้วมัน push เข้า array ของ court นั้นๆ เลย

  useEffect(() => {
    fetchCourts();
  }, []);

  const fetchCourts = async () => {
    try {
      const res = await fetch('/api/courts');
      if (res.ok) {
        const data = await res.json();
        // แปลงวันที่ให้เป็น string YYYY-MM-DD เพื่อใส่ใน input date ได้
        const formattedData = data.map((c: any) => ({
            ...c,
            closures: c.closures.map((cl: any) => ({
                ...cl,
                startDate: format(new Date(cl.startDate), 'yyyy-MM-dd'),
                endDate: format(new Date(cl.endDate), 'yyyy-MM-dd'),
            }))
        }));
        setCourts(formattedData);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // ฟังก์ชันแก้ไขค่าใน Input (ชื่อ, ประเภท, ราคา)
  const handleCourtChange = (id: number, field: keyof Court, value: any) => {
      setCourts(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  // ฟังก์ชันเพิ่มวันปิดปรับปรุง (ใน State)
  const addClosure = (courtId: number, start: string, end: string) => {
      if (!start || !end) return alert("กรุณาเลือกวันเริ่มต้นและสิ้นสุด");
      setCourts(prev => prev.map(c => {
          if (c.id === courtId) {
              return {
                  ...c,
                  closures: [...c.closures, { startDate: start, endDate: end }]
              };
          }
          return c;
      }));
  };

  // ฟังก์ชันลบวันปิดปรับปรุง (ใน State)
  const removeClosure = (courtId: number, index: number) => {
      setCourts(prev => prev.map(c => {
          if (c.id === courtId) {
              const newClosures = [...c.closures];
              newClosures.splice(index, 1);
              return { ...c, closures: newClosures };
          }
          return c;
      }));
  };

  // บันทึกข้อมูลลงฐานข้อมูล
  const saveCourtSettings = async (court: Court) => {
      if(!confirm(`ยืนยันการบันทึกข้อมูล ${court.name}?`)) return;

      try {
          const res = await fetch('/api/courts', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  id: court.id,
                  name: court.name, // ส่งชื่อใหม่ไป
                  type: court.type, // ส่งรายละเอียดใหม่ไป
                  price: Number(court.price),
                  closures: court.closures
              })
          });

          if (res.ok) {
              alert('บันทึกเรียบร้อย');
              fetchCourts(); // โหลดข้อมูลใหม่เพื่อให้ชัวร์
          } else {
              alert('เกิดข้อผิดพลาด');
          }
      } catch (error) {
          console.error(error);
          alert('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
      }
  };

  if (loading) return <div className="p-10 text-center text-slate-500">กำลังโหลดข้อมูล...</div>;

  return (
    <div className="max-w-4xl mx-auto pb-10 animate-fade-in">
        <h1 className="text-2xl font-extrabold text-slate-800 mb-6">⚙️ ตั้งค่าสนามและราคา</h1>
        
        <div className="space-y-8">
            {courts.map((court) => (
                <div key={court.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                    
                    {/* Header: ชื่อสนาม, ประเภท, ราคา, ปุ่มบันทึก */}
                    <div className="flex flex-col md:flex-row gap-6 mb-6 pb-6 border-b border-slate-100">
                        
                        {/* ส่วนแก้ไขชื่อและรายละเอียด */}
                        <div className="flex-1 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">ชื่อสนาม</label>
                                <input 
                                    type="text"
                                    value={court.name}
                                    onChange={(e) => handleCourtChange(court.id, 'name', e.target.value)}
                                    className="w-full text-xl font-extrabold text-slate-800 border-b-2 border-transparent hover:border-slate-200 focus:border-blue-500 focus:outline-none bg-transparent transition-colors placeholder:text-slate-300"
                                    placeholder="เช่น สนาม 1"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">รายละเอียด / ประเภทพื้น</label>
                                <input 
                                    type="text"
                                    value={court.type}
                                    onChange={(e) => handleCourtChange(court.id, 'type', e.target.value)}
                                    className="w-full text-slate-600 border-b-2 border-transparent hover:border-slate-200 focus:border-blue-500 focus:outline-none bg-transparent transition-colors placeholder:text-slate-300"
                                    placeholder="เช่น พื้นยางสังเคราะห์ PU"
                                />
                            </div>
                        </div>

                        {/* ส่วนแก้ไขราคาและปุ่มบันทึก */}
                        <div className="flex items-end gap-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1 text-right">ราคา/ชม.</label>
                                <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                                    <input 
                                        type="number"
                                        value={court.price}
                                        onChange={(e) => handleCourtChange(court.id, 'price', e.target.value)}
                                        className="w-16 bg-transparent font-bold text-right outline-none text-slate-800"
                                    />
                                    <span className="text-sm text-slate-500">฿</span>
                                </div>
                            </div>
                            <button 
                                onClick={() => saveCourtSettings(court)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-200 transition active:scale-95 h-[42px]"
                            >
                                บันทึก
                            </button>
                        </div>
                    </div>

                    {/* Section: วันปิดปรับปรุง */}
                    <div>
                        <h4 className="font-bold text-slate-700 mb-3 text-sm">⛔ กำหนดวันปิดปรับปรุง:</h4>
                        
                        {/* Form เพิ่มวันปิด */}
                        <div className="bg-slate-50 p-4 rounded-xl flex flex-wrap gap-3 items-end mb-4 border border-slate-100">
                            <div>
                                <span className="text-xs text-slate-400 block mb-1">เริ่มวันที่</span>
                                <input type="date" id={`start-${court.id}`} className="p-2 rounded-lg border border-slate-200 text-sm text-slate-600 focus:outline-blue-500" />
                            </div>
                            <div>
                                <span className="text-xs text-slate-400 block mb-1">ถึงวันที่</span>
                                <input type="date" id={`end-${court.id}`} className="p-2 rounded-lg border border-slate-200 text-sm text-slate-600 focus:outline-blue-500" />
                            </div>
                            <button 
                                onClick={() => {
                                    const startEl = document.getElementById(`start-${court.id}`) as HTMLInputElement;
                                    const endEl = document.getElementById(`end-${court.id}`) as HTMLInputElement;
                                    addClosure(court.id, startEl.value, endEl.value);
                                    startEl.value = ''; // Reset input
                                    endEl.value = '';
                                }}
                                className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-600 transition shadow-md shadow-red-200"
                            >
                                + เพิ่ม
                            </button>
                        </div>

                        {/* รายการวันปิดที่มีอยู่ */}
                        {court.closures.length > 0 ? (
                            <div className="space-y-2">
                                {court.closures.map((closure, index) => (
                                    <div key={index} className="flex justify-between items-center bg-red-50 text-red-700 px-4 py-2 rounded-lg border border-red-100 text-sm">
                                        <span className="font-medium">
                                            {format(new Date(closure.startDate), "d MMM yy", { locale: th })} - {format(new Date(closure.endDate), "d MMM yy", { locale: th })}
                                        </span>
                                        <button 
                                            onClick={() => removeClosure(court.id, index)}
                                            className="text-red-400 hover:text-red-700 font-bold px-2"
                                        >
                                            ลบ
                                        </button>
                                    </div>
                                ))}
                                <p className="text-xs text-slate-400 mt-2 text-right">* กด "บันทึก" ด้านบนเพื่อยืนยันการเปลี่ยนแปลงวันปิดปรับปรุง</p>
                            </div>
                        ) : (
                            <p className="text-xs text-slate-400 italic">ไม่มีรายการปิดปรับปรุง</p>
                        )}
                    </div>

                </div>
            ))}
        </div>
    </div>
  );
}