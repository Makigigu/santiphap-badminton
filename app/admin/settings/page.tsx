'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

type Closure = {
  id?: number;
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

  // Payment Settings State
  const [paymentSetting, setPaymentSetting] = useState({
    promptPayId: '',
    accountName: '',
    bankName: '',
  });
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  useEffect(() => {
    fetchCourts();
    fetchPaymentSetting();
  }, []);

  const fetchPaymentSetting = async () => {
    try {
      const res = await fetch('/api/settings/payment');
      if (res.ok) {
        const data = await res.json();
        setPaymentSetting({
          promptPayId: data.promptPayId || '',
          accountName: data.accountName || '',
          bankName: data.bankName || '',
        });
      }
    } catch (error) {
      console.error('Fetch payment settings error:', error);
    }
  };

  const savePaymentSetting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentSetting.promptPayId.trim()) return alert('กรุณากรอกหมายเลขพร้อมเพย์');
    if (!paymentSetting.accountName.trim()) return alert('กรุณากรอกชื่อเจ้าของบัญชี');
    if (!paymentSetting.bankName.trim()) return alert('กรุณากรอกชื่อธนาคาร');

    if (!confirm('ยืนยันการบันทึกข้อมูลบัญชีพร้อมเพย์รับเงิน?\n(ข้อมูลจะถูกนำไปใช้ออก QR Code ในหน้าชำระเงินและหน้าแรก)')) return;

    setIsSavingPayment(true);
    try {
      const res = await fetch('/api/settings/payment', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentSetting),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        alert('✅ บันทึกข้อมูลบัญชีพร้อมเพย์เรียบร้อยแล้ว!\nหน้าแรกและหน้าชำระเงินจะเปลี่ยนตามทันที');
        if (data.data) {
          setPaymentSetting(data.data);
        }
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการบันทึก');
      }
    } catch (error) {
      console.error(error);
      alert('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
    } finally {
      setIsSavingPayment(false);
    }
  };

  const fetchCourts = async () => {
    try {
      const res = await fetch('/api/courts');
      if (res.ok) {
        const data = await res.json();
        const formattedData = data.map((c: any) => ({
          ...c,
          closures: c.closures.map((cl: any) => ({
            ...cl,
            startDate: format(new Date(cl.startDate), 'yyyy-MM-dd'),
            endDate: format(new Date(cl.endDate), 'yyyy-MM-dd'),
          })),
        }));
        setCourts(formattedData);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // ฟังก์ชันเพิ่มสนาม (มี Confirm)
  const createNewCourt = async () => {
    if (!confirm('➕ ยืนยันการ "เพิ่มสนามใหม่" ใช่หรือไม่?')) return;

    try {
      const res = await fetch('/api/courts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `สนาม ${courts.length + 1}`,
          type: 'พื้นยางมาตรฐาน',
          price: 150,
        }),
      });

      if (res.ok) {
        alert('เพิ่มสนามเรียบร้อย!');
        fetchCourts();
      } else {
        alert('สร้างสนามไม่สำเร็จ');
      }
    } catch (error) {
      console.error(error);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  // ฟังก์ชันลบสนาม
  const deleteCourt = async (id: number, name: string) => {
      const confirmMsg = `⚠️ คำเตือน: คุณต้องการลบ "${name}" ใช่หรือไม่?\n\nหากลบแล้ว ประวัติการจองของสนามนี้อาจหายไปหรือแสดงผลผิดพลาดได้`;
      if (!confirm(confirmMsg)) return;

      try {
          const res = await fetch('/api/courts', {
              method: 'DELETE', // ต้องแน่ใจว่า API รองรับ DELETE
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id }),
          });

          if (res.ok) {
              alert('ลบสนามเรียบร้อย');
              fetchCourts();
          } else {
              alert('ไม่สามารถลบสนามได้ (อาจมีการจองค้างอยู่)');
          }
      } catch (error) {
          console.error(error);
          alert('เกิดข้อผิดพลาด');
      }
  };

  const handleCourtChange = (id: number, field: keyof Court, value: any) => {
    setCourts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const addClosure = (courtId: number, start: string, end: string) => {
    if (!start || !end) return alert('กรุณาเลือกวันเริ่มต้นและสิ้นสุด');
    setCourts((prev) =>
      prev.map((c) => {
        if (c.id === courtId) {
          return {
            ...c,
            closures: [...c.closures, { startDate: start, endDate: end }],
          };
        }
        return c;
      })
    );
  };

  const removeClosure = (courtId: number, index: number) => {
    setCourts((prev) =>
      prev.map((c) => {
        if (c.id === courtId) {
          const newClosures = [...c.closures];
          newClosures.splice(index, 1);
          return { ...c, closures: newClosures };
        }
        return c;
      })
    );
  };

  const saveCourtSettings = async (court: Court) => {
    if (!confirm(`ยืนยันการบันทึกข้อมูล ${court.name}?`)) return;

    try {
      const res = await fetch('/api/courts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: court.id,
          name: court.name,
          type: court.type,
          price: Number(court.price),
          closures: court.closures,
        }),
      });

      if (res.ok) {
        alert('บันทึกเรียบร้อย');
        fetchCourts();
      } else {
        alert('เกิดข้อผิดพลาด');
      }
    } catch (error) {
      console.error(error);
      alert('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
    }
  };

  if (loading)
    return <div className="p-10 text-center text-slate-500">กำลังโหลดข้อมูล...</div>;

  return (
    <div className="max-w-4xl mx-auto pb-10 animate-fade-in">
      {/* Header และปุ่มเพิ่มสนาม */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-2xl font-extrabold text-slate-800">
          ⚙️ ตั้งค่าสนามและระบบ
        </h1>
        
        <button
          onClick={createNewCourt}
          className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-green-200 transition active:scale-95"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span>เพิ่มสนามใหม่</span>
        </button>
      </div>

      {/* ส่วนตั้งค่าบัญชีรับเงิน (พร้อมเพย์ PromptPay) */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 mb-8">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm">
            ฿
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-800">
              ตั้งค่าบัญชีรับเงิน (พร้อมเพย์ / PromptPay)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              ข้อมูลนี้จะถูกนำไปใช้สร้าง QR Code สแกนจ่ายเงินในหน้าชำระเงินและแสดงที่หน้าแรกของเว็บ
            </p>
          </div>
        </div>

        <form onSubmit={savePaymentSetting} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-2 uppercase">
                หมายเลขพร้อมเพย์ <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={paymentSetting.promptPayId}
                onChange={(e) =>
                  setPaymentSetting((prev) => ({ ...prev, promptPayId: e.target.value }))
                }
                placeholder="เบอร์โทร 10 หลัก หรือเลขบัตร 13 หลัก"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                เช่น 0640388696 (พิมพ์เฉพาะตัวเลข)
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-2 uppercase">
                ชื่อ-นามสกุล เจ้าของบัญชี <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={paymentSetting.accountName}
                onChange={(e) =>
                  setPaymentSetting((prev) => ({ ...prev, accountName: e.target.value }))
                }
                placeholder="เช่น นายมงคลชัย ต๊อดแก้ว"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-2 uppercase">
                ชื่อธนาคาร / บริการ <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={paymentSetting.bankName}
                onChange={(e) =>
                  setPaymentSetting((prev) => ({ ...prev, bankName: e.target.value }))
                }
                placeholder="เช่น ธนาคารกรุงไทย, ธนาคารกสิกรไทย"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-xl border border-slate-200 flex items-center justify-center font-bold text-blue-600 text-xs shadow-xs">
                QR
              </div>
              <div>
                <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 inline-block mb-0.5">
                  {paymentSetting.bankName || 'ธนาคาร'}
                </span>
                <p className="text-sm font-extrabold text-slate-800">
                  {paymentSetting.accountName || 'ชื่อเจ้าของบัญชี'}
                </p>
                <p className="text-xs font-mono text-slate-500">
                  พร้อมเพย์: {paymentSetting.promptPayId || '0xx-xxx-xxxx'}
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSavingPayment}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 active:scale-95 transition disabled:opacity-50"
            >
              {isSavingPayment ? 'กำลังบันทึก...' : 'บันทึกข้อมูลบัญชีพร้อมเพย์'}
            </button>
          </div>
        </form>
      </div>

      <div className="flex items-center justify-between mb-4 mt-8 pt-6 border-t border-slate-200">
        <div>
          <h2 className="text-lg font-extrabold text-slate-800">
            รายการสนามแบดมินตัน ({courts.length} สนาม)
          </h2>
          <p className="text-xs text-slate-500">ปรับราคา กำหนดวันปิดปรับปรุง หรือลบสนาม</p>
        </div>
      </div>

      <div className="space-y-8">
        {courts.map((court) => (
          <div
            key={court.id}
            className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200"
          >
            {/* Header: ชื่อสนาม, ประเภท, ราคา, ปุ่มบันทึก */}
            <div className="flex flex-col md:flex-row gap-6 mb-6 pb-6 border-b border-slate-100">
              
              <div className="flex-1 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">
                    ชื่อสนาม
                  </label>
                  <input
                    type="text"
                    value={court.name}
                    onChange={(e) =>
                      handleCourtChange(court.id, 'name', e.target.value)
                    }
                    className="w-full text-xl font-extrabold text-slate-800 border-b-2 border-transparent hover:border-slate-200 focus:border-blue-500 focus:outline-none bg-transparent transition-colors placeholder:text-slate-300"
                    placeholder="เช่น สนาม 1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">
                    รายละเอียด / ประเภทพื้น
                  </label>
                  <input
                    type="text"
                    value={court.type}
                    onChange={(e) =>
                      handleCourtChange(court.id, 'type', e.target.value)
                    }
                    className="w-full text-slate-600 border-b-2 border-transparent hover:border-slate-200 focus:border-blue-500 focus:outline-none bg-transparent transition-colors placeholder:text-slate-300"
                    placeholder="เช่น พื้นยางสังเคราะห์ PU"
                  />
                </div>
              </div>

              {/* ส่วนแก้ไขราคาและปุ่ม Action */}
              <div className="flex items-end gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1 text-right">
                    ราคา/ชม.
                  </label>
                  <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                    <input
                      type="number"
                      value={court.price}
                      onChange={(e) =>
                        handleCourtChange(court.id, 'price', e.target.value)
                      }
                      className="w-16 bg-transparent font-bold text-right outline-none text-slate-800"
                    />
                    <span className="text-sm text-slate-500">฿</span>
                  </div>
                </div>

                {/* ปุ่มลบสนาม (สีแดง) */}
                <button
                  onClick={() => deleteCourt(court.id, court.name)}
                  className="bg-red-50 hover:bg-red-100 text-red-500 border border-red-200 px-3 py-2.5 rounded-xl transition active:scale-95 h-[42px] flex items-center justify-center"
                  title="ลบสนามนี้"
                >
                   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>

                {/* ปุ่มบันทึก (สีน้ำเงิน) */}
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
              <h4 className="font-bold text-slate-700 mb-3 text-sm">
                ⛔ กำหนดวันปิดปรับปรุง:
              </h4>

              <div className="bg-slate-50 p-4 rounded-xl flex flex-wrap gap-3 items-end mb-4 border border-slate-100">
                <div>
                  <span className="text-xs text-slate-400 block mb-1">
                    เริ่มวันที่
                  </span>
                  <input
                    type="date"
                    id={`start-${court.id}`}
                    className="p-2 rounded-lg border border-slate-200 text-sm text-slate-600 focus:outline-blue-500"
                  />
                </div>
                <div>
                  <span className="text-xs text-slate-400 block mb-1">
                    ถึงวันที่
                  </span>
                  <input
                    type="date"
                    id={`end-${court.id}`}
                    className="p-2 rounded-lg border border-slate-200 text-sm text-slate-600 focus:outline-blue-500"
                  />
                </div>
                <button
                  onClick={() => {
                    const startEl = document.getElementById(
                      `start-${court.id}`
                    ) as HTMLInputElement;
                    const endEl = document.getElementById(
                      `end-${court.id}`
                    ) as HTMLInputElement;
                    addClosure(court.id, startEl.value, endEl.value);
                    startEl.value = '';
                    endEl.value = '';
                  }}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-600 transition shadow-md shadow-red-200"
                >
                  + เพิ่ม
                </button>
              </div>

              {court.closures.length > 0 ? (
                <div className="space-y-2">
                  {court.closures.map((closure, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center bg-red-50 text-red-700 px-4 py-2 rounded-lg border border-red-100 text-sm"
                    >
                      <span className="font-medium">
                        {format(new Date(closure.startDate), 'd MMM yy', {
                          locale: th,
                        })}{' '}
                        -{' '}
                        {format(new Date(closure.endDate), 'd MMM yy', {
                          locale: th,
                        })}
                      </span>
                      <button
                        onClick={() => removeClosure(court.id, index)}
                        className="text-red-400 hover:text-red-700 font-bold px-2"
                      >
                        ลบ
                      </button>
                    </div>
                  ))}
                  <p className="text-xs text-slate-400 mt-2 text-right">
                    * กด "บันทึก" ด้านบนเพื่อยืนยันการเปลี่ยนแปลงวันปิดปรับปรุง
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  ไม่มีรายการปิดปรับปรุง
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}