'use client';

import { useState, useEffect } from 'react';

type CourtRule = {
  id: number;
  title: string;
  description: string;
  orderNumber: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export default function AdminRulesPage() {
  const [rules, setRules] = useState<CourtRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<CourtRule | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formOrderNumber, setFormOrderNumber] = useState<number>(1);
  const [formIsActive, setFormIsActive] = useState<boolean>(true);

  // Search/Filter
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/rules?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setRules(data);
      } else {
        alert('ไม่สามารถดึงข้อมูลกฎระเบียบได้');
      }
    } catch (error) {
      console.error('Fetch rules error:', error);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingRule(null);
    setFormTitle('');
    setFormDescription('');
    // ตั้งค่าเลขลำดับถัดไปให้อัตโนมัติ
    const nextOrder = rules.length > 0 ? Math.max(...rules.map((r) => r.orderNumber)) + 1 : 1;
    setFormOrderNumber(nextOrder);
    setFormIsActive(true);
    setShowModal(true);
  };

  const openEditModal = (rule: CourtRule) => {
    setEditingRule(rule);
    setFormTitle(rule.title);
    setFormDescription(rule.description);
    setFormOrderNumber(rule.orderNumber);
    setFormIsActive(rule.isActive);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      alert('กรุณากรอกหัวข้อกฎ');
      return;
    }
    if (!formDescription.trim()) {
      alert('กรุณากรอกรายละเอียดกฎ');
      return;
    }

    setIsSaving(true);
    try {
      if (editingRule) {
        // แก้ไข
        const res = await fetch('/api/rules', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingRule.id,
            title: formTitle,
            description: formDescription,
            orderNumber: formOrderNumber,
            isActive: formIsActive,
          }),
        });

        if (res.ok) {
          setShowModal(false);
          await fetchRules();
        } else {
          const err = await res.json();
          alert(err.error || 'แก้ไขกฎไม่สำเร็จ');
        }
      } else {
        // เพิ่มใหม่
        const res = await fetch('/api/rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formTitle,
            description: formDescription,
            orderNumber: formOrderNumber,
            isActive: formIsActive,
          }),
        });

        if (res.ok) {
          setShowModal(false);
          await fetchRules();
        } else {
          const err = await res.json();
          alert(err.error || 'เพิ่มกฎไม่สำเร็จ');
        }
      }
    } catch (error) {
      console.error('Save rule error:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (rule: CourtRule) => {
    const confirmDelete = confirm(
      `⚠️ ยืนยันการลบกฎข้อที่ ${rule.orderNumber} "${rule.title}" หรือไม่?\n\nเมื่อลบแล้วจะไม่สามารถกู้คืนได้`
    );
    if (!confirmDelete) return;

    setDeletingId(rule.id);
    try {
      const res = await fetch(`/api/rules?id=${rule.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchRules();
      } else {
        const err = await res.json();
        alert(err.error || 'ลบกฎไม่สำเร็จ');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('เกิดข้อผิดพลาดในการลบข้อมูล');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (rule: CourtRule) => {
    try {
      const newStatus = !rule.isActive;
      // Optimistic update
      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...r, isActive: newStatus } : r))
      );

      const res = await fetch('/api/rules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: rule.id,
          isActive: newStatus,
        }),
      });

      if (!res.ok) {
        // Revert on error
        setRules((prev) =>
          prev.map((r) => (r.id === rule.id ? { ...r, isActive: rule.isActive } : r))
        );
        alert('ไม่สามารถเปลี่ยนสถานะได้');
      }
    } catch (error) {
      console.error('Toggle error:', error);
      fetchRules();
    }
  };

  const handleMoveOrder = async (rule: CourtRule, direction: 'up' | 'down') => {
    const sorted = [...rules].sort((a, b) => a.orderNumber - b.orderNumber);
    const currentIndex = sorted.findIndex((r) => r.id === rule.id);
    if (direction === 'up' && currentIndex <= 0) return;
    if (direction === 'down' && currentIndex >= sorted.length - 1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const targetRule = sorted[targetIndex];

    const currentOrder = rule.orderNumber;
    const targetOrder = targetRule.orderNumber;

    // ถ้า order ซ้ำกัน ให้จัดระยะห่าง
    const newTargetOrder = targetOrder === currentOrder ? (direction === 'up' ? targetOrder - 1 : targetOrder + 1) : targetOrder;

    try {
      await Promise.all([
        fetch('/api/rules', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: rule.id, orderNumber: newTargetOrder }),
        }),
        fetch('/api/rules', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: targetRule.id, orderNumber: currentOrder }),
        }),
      ]);
      fetchRules();
    } catch (error) {
      console.error('Move order error:', error);
      fetchRules();
    }
  };

  const filteredRules = rules.filter(
    (r) =>
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(r.orderNumber).includes(searchTerm)
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="M9 12h6"></path><path d="M9 16h6"></path><path d="M9 8h6"></path></svg>
            </span>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                จัดการกฎระเบียบสนาม
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                เพิ่ม ลบ หรือแก้ไขข้อตกลงและเงื่อนไขที่แสดงบนหน้าแรกของเว็บไซต์
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 active:scale-95 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          เพิ่มกฎข้อใหม่
        </button>
      </div>

      {/* Overview Cards & Search */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 block mb-1">กฎทั้งหมด</span>
            <span className="text-2xl font-black text-slate-800">{rules.length} ข้อ</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold">
            #
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-emerald-600 block mb-1">กำลังแสดงผลบนเว็บ</span>
            <span className="text-2xl font-black text-emerald-600">
              {rules.filter((r) => r.isActive).length} ข้อ
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            ✓
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-amber-600 block mb-1">ปิดซ่อนชั่วคราว</span>
            <span className="text-2xl font-black text-amber-600">
              {rules.filter((r) => !r.isActive).length} ข้อ
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            ✕
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="ค้นหาตามหัวข้อ, รายละเอียด หรือเลขข้อ..."
          className="flex-1 bg-transparent text-sm font-medium outline-none text-slate-800 placeholder:text-slate-400"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="text-xs font-bold text-slate-400 hover:text-slate-600"
          >
            ล้างคำค้นหา
          </button>
        )}
      </div>

      {/* Rules List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm animate-pulse flex gap-4">
              <div className="w-12 h-12 bg-slate-100 rounded-2xl shrink-0"></div>
              <div className="flex-1 space-y-2">
                <div className="h-5 bg-slate-100 rounded-lg w-1/4"></div>
                <div className="h-4 bg-slate-100 rounded-lg w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredRules.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200/80 text-center shadow-sm">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">ยังไม่มีรายการกฎระเบียบ</h3>
          <p className="text-sm text-slate-500 mb-6">คุณสามารถเริ่มเพิ่มกฎข้อแรกสำหรับแสดงบนหน้าเว็บได้ทันที</p>
          <button
            onClick={openAddModal}
            className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition"
          >
            + เพิ่มกฎข้อแรก
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRules.map((rule, idx) => (
            <div
              key={rule.id}
              className={`bg-white rounded-3xl border transition-all duration-200 p-6 shadow-sm hover:shadow-md ${
                rule.isActive ? 'border-slate-200/80' : 'border-amber-200/70 bg-amber-50/20'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                {/* Left Side: Order & Content */}
                <div className="flex items-start gap-4 flex-1">
                  {/* Badge เลขข้อ */}
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-extrabold text-base shadow-inner ${
                        rule.isActive
                          ? 'bg-blue-50 text-blue-600 border border-blue-100'
                          : 'bg-slate-100 text-slate-400 border border-slate-200'
                      }`}
                    >
                      {rule.orderNumber}
                    </div>

                    {/* ปุ่มขยับลำดับ */}
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => handleMoveOrder(rule, 'up')}
                        disabled={idx === 0}
                        title="ขยับขึ้น"
                        className="p-1 text-slate-400 hover:text-blue-600 disabled:opacity-30 disabled:hover:text-slate-400 transition"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
                      </button>
                      <button
                        onClick={() => handleMoveOrder(rule, 'down')}
                        disabled={idx === filteredRules.length - 1}
                        title="ขยับลง"
                        className="p-1 text-slate-400 hover:text-blue-600 disabled:opacity-30 disabled:hover:text-slate-400 transition"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                      </button>
                    </div>
                  </div>

                  {/* รายละเอียดกฎ */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                        {rule.title}
                      </h3>
                      {rule.isActive ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/80">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          กำลังแสดงบนเว็บ
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          ซ่อนไว้ชั่วคราว
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed font-normal whitespace-pre-line">
                      {rule.description}
                    </p>
                  </div>
                </div>

                {/* Right Side: Actions */}
                <div className="flex items-center gap-2 self-end md:self-start shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 w-full md:w-auto justify-end">
                  {/* Toggle Switch */}
                  <button
                    onClick={() => handleToggleActive(rule)}
                    className={`text-xs font-bold px-3 py-2 rounded-xl transition flex items-center gap-1.5 ${
                      rule.isActive
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                    }`}
                    title={rule.isActive ? 'กดเพื่อซ่อนกฎนี้' : 'กดเพื่อเปิดแสดงกฎนี้'}
                  >
                    {rule.isActive ? 'ซ่อน' : 'เปิดใช้งาน'}
                  </button>

                  {/* ปุ่มแก้ไข */}
                  <button
                    onClick={() => openEditModal(rule)}
                    className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition flex items-center gap-1 text-xs font-bold"
                    title="แก้ไขข้อมูลกฎนี้"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                    <span>แก้ไข</span>
                  </button>

                  {/* ปุ่มลบ */}
                  <button
                    onClick={() => handleDelete(rule)}
                    disabled={deletingId === rule.id}
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition flex items-center gap-1 text-xs font-bold disabled:opacity-40"
                    title="ลบกฎข้อนี้"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    <span>{deletingId === rule.id ? 'กำลังลบ...' : 'ลบ'}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal เพิ่ม / แก้ไขกฎ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-slate-100 relative animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="M9 12h6"></path><path d="M9 16h6"></path><path d="M9 8h6"></path></svg>
                </div>
                <h3 className="text-xl font-extrabold text-slate-800">
                  {editingRule ? 'แก้ไขกฎระเบียบ' : 'เพิ่มกฎระเบียบข้อใหม่'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                    หัวข้อกฎ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="เช่น การจองและชำระเงิน, มารยาทการใช้สนาม"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                    ลำดับข้อที่ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formOrderNumber}
                    onChange={(e) => setFormOrderNumber(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                  รายละเอียดกฎ <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="กรอกข้อความระเบียบ ข้อห้าม หรือข้อตกลงในการใช้สนาม..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-normal text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition leading-relaxed resize-none"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200/60">
                <div>
                  <span className="text-sm font-bold text-slate-800 block">เปิดแสดงบนเว็บไซต์</span>
                  <span className="text-xs text-slate-500">หากปิดไว้ ลูกค้าจะไม่เห็นกฎข้อนี้ที่หน้าแรก</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={isSaving}
                  className="px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 active:scale-95 transition disabled:opacity-50"
                >
                  {isSaving ? 'กำลังบันทึก...' : editingRule ? 'บันทึกการแก้ไข' : 'เพิ่มกฎข้อใหม่'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
