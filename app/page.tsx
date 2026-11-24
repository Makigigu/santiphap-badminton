'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

type CourtRule = {
  id: number;
  title: string;
  description: string;
  orderNumber: number;
  isActive: boolean;
};

const DEFAULT_RULES: CourtRule[] = [
  {
    id: 1,
    title: 'การจองและชำระเงิน',
    description:
      'เมื่อทำการจองแล้ว ต้องโอนชำระเงินเต็มจำนวนทันที พร้อมแนบสลิปเพื่อยืนยันสิทธิ์ หากไม่ดำเนินการเป็นเวลา 30 นาที ระบบจะยกเลิกการจองทันที',
    orderNumber: 1,
    isActive: true,
  },
  {
    id: 2,
    title: 'การเลื่อน/ยกเลิก',
    description:
      'ต้องการเลื่อนวัน ต้องแจ้งล่วงหน้าอย่างน้อย 1 วัน (ก่อน 22:00 น.) สามารถเลื่อนได้ 1 ครั้งภายในเดือนเดียวกัน สงวนสิทธิ์ไม่คืนเงินทุกกรณี',
    orderNumber: 2,
    isActive: true,
  },
  {
    id: 3,
    title: 'มารยาทการใช้สนาม',
    description:
      'กรุณาสวมรองเท้ากีฬาแบดมินตันเท่านั้น เพื่อรักษาพื้นสนาม และออกจากคอร์ทเมื่อหมดเวลาจอง เพื่อให้ลูกค้าท่านถัดไปได้ใช้บริการ',
    orderNumber: 3,
    isActive: true,
  },
];

export default function Home() {
  const [rules, setRules] = useState<CourtRule[]>(DEFAULT_RULES);
  const [loadingRules, setLoadingRules] = useState(true);
  const [paymentSetting, setPaymentSetting] = useState({
    promptPayId: process.env.NEXT_PUBLIC_PROMPTPAY_ID || '0640388696',
    accountName: process.env.NEXT_PUBLIC_PROMPTPAY_NAME || 'นายมงคลชัย ต๊อดแก้ว',
    bankName: process.env.NEXT_PUBLIC_PROMPTPAY_BANK || 'ธนาคารกรุงไทย',
  });
  const [contactSetting, setContactSetting] = useState({
    phoneNumber: '064-038-8696',
    openTime: '08:00 - 22:00 น.',
    lineId: '@SantiphapBad',
    lineUrl: 'https://line.me/R/ti/p/@915avwsq',
    facebookName: 'ติดตามข่าวสารต่างๆ',
    facebookUrl: 'https://www.facebook.com/profile.php?id=100069056293502',
  });
  const [profileSetting, setProfileSetting] = useState({
    siteName: 'สันติภาพแบดมินตัน',
    slogan: 'สนามแบดมินตันมาตรฐาน จังหวัด น่าน',
    description: 'สนามพื้นยางมาตรฐาน ไฟสว่าง มีสิ่งอำนวยความสะดวก พร้อมจองออนไลน์ 24 ชั่วโมง',
    logoUrl: '/logo.jpg',
    heroImageUrl: '/CBadminton.jpg',
    aboutImage1Url: 'https://i.pinimg.com/1200x/e3/b8/89/e3b8892a83a2cb1738291fa31ad32a1c.jpg',
    aboutImage2Url: 'https://i.pinimg.com/736x/1b/98/b7/1b98b7b809d1fb90c76bcf0d892adb7d.jpg',
    rulesImageUrl: 'https://i.pinimg.com/736x/3b/07/70/3b077015daefe8c84e501d2b418fa37d.jpg',
  });

  useEffect(() => {
    async function loadData() {
      try {
        const [rulesRes, paymentRes, contactRes, profileRes] = await Promise.all([
          fetch('/api/rules?activeOnly=true'),
          fetch('/api/settings/payment'),
          fetch('/api/settings/contact'),
          fetch('/api/settings/profile'),
        ]);

        if (rulesRes.ok) {
          const data = await rulesRes.json();
          if (Array.isArray(data) && data.length > 0) {
            setRules(data);
          }
        }

        if (paymentRes.ok) {
          const pData = await paymentRes.json();
          if (pData.promptPayId) {
            setPaymentSetting(pData);
          }
        }

        if (contactRes.ok) {
          const cData = await contactRes.json();
          if (cData.phoneNumber) {
            setContactSetting(cData);
          }
        }

        if (profileRes.ok) {
          const profData = await profileRes.json();
          if (profData.siteName) {
            setProfileSetting(profData);
          }
        }
      } catch (e) {
        console.error('Error loading data:', e);
      } finally {
        setLoadingRules(false);
      }
    }
    loadData();
  }, []);

  const formattedPromptPay = paymentSetting.promptPayId.length === 10
    ? `${paymentSetting.promptPayId.slice(0, 3)}-${paymentSetting.promptPayId.slice(3, 6)}-${paymentSetting.promptPayId.slice(6)}`
    : paymentSetting.promptPayId.length === 13
    ? `${paymentSetting.promptPayId.slice(0, 1)}-${paymentSetting.promptPayId.slice(1, 5)}-${paymentSetting.promptPayId.slice(5, 10)}-${paymentSetting.promptPayId.slice(10, 12)}-${paymentSetting.promptPayId.slice(12)}`
    : paymentSetting.promptPayId;

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-blue-100 pb-10">
      
      {/* --- Navbar --- */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md shadow-sm z-50 border-b border-slate-100 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 cursor-pointer group">
            {/* รูป Logo */}
            <img 
                src={profileSetting.logoUrl || "/logo.jpg"} 
                alt="Logo" 
                className="w-10 h-10 object-contain rounded-lg group-hover:scale-110 transition-transform" 
                onError={(e) => { (e.target as HTMLImageElement).src = '/logo.jpg'; }}
            />
            {/* ข้อความโลโก้ */}
            <div className="text-xl md:text-2xl font-extrabold text-slate-800 tracking-tight">
              {profileSetting.siteName || 'สันติภาพแบดมินตัน'}
            </div>
          </Link>
          
          <div className="flex items-center gap-2 md:gap-4">
            {/* ปุ่มประวัติการจอง */}
            <Link href="/history" className="flex items-center gap-2 text-slate-600 hover:text-blue-600 font-bold transition px-4 py-2 rounded-full hover:bg-slate-50 text-sm md:text-base border border-transparent hover:border-slate-100">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              <span>ประวัติการจอง</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* --- Hero Section --- */}
      <div className="relative h-[500px] md:h-[600px] flex items-center justify-center mt-16 overflow-hidden">
        {/* Background Image */}
        <div 
            className="absolute inset-0 bg-cover bg-center animate-kenburns"
            style={{
                backgroundImage: `url('${profileSetting.heroImageUrl || "/CBadminton.jpg"}')`,
            }}
        ></div>
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-slate-900/30"></div>
        
        {/* Content */}
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto mt-10">
            <span className="inline-block py-1 px-3 rounded-full bg-blue-500/20 text-blue-100 border border-blue-400/30 text-10xl font-bold mb-4 backdrop-blur-sm">
                {profileSetting.slogan || 'สนามแบดมินตันมาตรฐาน จังหวัด น่าน'}
            </span>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white mb-6 tracking-tight drop-shadow-lg leading-tight">
                จองสนามง่าย <br className="hidden md:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                    ตีสแมชได้เต็มที่
                </span>
            </h1>
            <p className="text-lg md:text-xl text-slate-200 mb-8 font-light max-w-2xl mx-auto drop-shadow-md">
                {profileSetting.description || 'สนามพื้นยางมาตรฐาน ไฟสว่าง มีสิ่งอำนวยความสะดวก พร้อมจองออนไลน์ 24 ชั่วโมง'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/booking" className="px-8 py-4 rounded-full bg-blue-600 text-white font-bold text-lg hover:bg-blue-500 transition shadow-lg shadow-blue-900/50 hover:scale-105 transform">
                    จองคอร์ททันที
                </Link>
                <a href="#channels" className="px-8 py-4 rounded-full bg-white/10 backdrop-blur-md text-white font-bold text-lg hover:bg-white/20 transition border border-white/20">
                    ดูช่องทางติดต่อ
                </a>
            </div>
        </div>
      </div>

      {/* --- ช่องทางการจองคอร์ท --- */}
      <section id="channels" className="py-20 bg-white -mt-10 relative z-20 rounded-t-[3rem]">
        <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">เลือกช่องทางจองคอร์ท</h2>
                <p className="text-slate-500 text-lg">สะดวกทางไหน เลือกจองทางนั้นได้เลย</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Card 1: Online */}
                <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col items-start hover:-translate-y-2 transition-transform duration-300 h-full">
                    <div className="w-14 h-14 bg-red-500 rounded-2xl flex items-center justify-center text-white text-2xl mb-6 shadow-lg shadow-red-200">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-slate-800">จองคอร์ทออนไลน์</h3>
                    <p className="text-slate-500 text-sm leading-relaxed mb-6 flex-grow">
                        เช็คตารางว่างและกดจองได้ทันทีตลอด 24 ชม. สะดวก รวดเร็ว ไม่ต้องรอแอดมินตอบ
                    </p>
                    <Link href="/booking" className="w-full py-3.5 rounded-xl bg-red-600 text-white font-bold text-center shadow-md hover:bg-red-700 hover:shadow-lg transition-all">
                        คลิกเพื่อจองเอง
                    </Link>
                </div>

                {/* Card 2: Phone */}
                <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col items-start hover:-translate-y-2 transition-transform duration-300 h-full">
                    <div className="w-14 h-14 bg-pink-500 rounded-2xl flex items-center justify-center text-white text-2xl mb-6 shadow-lg shadow-pink-200">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-slate-800">จองผ่านโทรศัพท์</h3>
                    <div className="text-slate-500 text-sm leading-relaxed mb-6 flex-grow">
                        <p className="font-semibold text-slate-700">{contactSetting.phoneNumber}</p>
                        <p>{contactSetting.openTime}</p>
                    </div>
                    <a href={`tel:${contactSetting.phoneNumber.replace(/[^0-9]/g, '') || contactSetting.phoneNumber}`} className="w-full py-3.5 rounded-xl bg-slate-100 text-slate-800 font-bold text-center hover:bg-slate-200 transition-colors">
                        กดเพื่อโทรออก
                    </a>
                </div>

                {/* Card 3: Line */}
                <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col items-start hover:-translate-y-2 transition-transform duration-300 h-full">
                    <div className="w-14 h-14 bg-green-500 rounded-2xl flex items-center justify-center text-white text-2xl mb-6 shadow-lg shadow-green-200">
                        <span className="font-bold text-sm">LINE</span>
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-slate-800">ทักแชทไลน์</h3>
                    <div className="text-slate-500 text-sm leading-relaxed mb-6 flex-grow">
                        <p>สอบถามข้อมูล หรือแจ้งปัญหา</p>
                        <p>{contactSetting.lineId}</p>
                    </div>
                    <a href={contactSetting.lineUrl} target="_blank" rel="noreferrer" className="w-full py-3.5 rounded-xl bg-green-500 text-white font-bold text-center shadow-md hover:bg-green-600 transition-colors">
                        แอดไลน์
                    </a>
                </div>

                {/* Card 4: Facebook */}
                <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col items-start hover:-translate-y-2 transition-transform duration-300 h-full">
                    <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-2xl mb-6 shadow-lg shadow-blue-200">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-slate-800">ทัก Inbox เพจ</h3>
                    <div className="text-slate-500 text-sm leading-relaxed mb-6 flex-grow">
                        <p>{contactSetting.facebookName}</p>
                    </div>
                    <a 
                        href={contactSetting.facebookUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-bold text-center shadow-md hover:bg-blue-700 transition-colors"
                    >
                        ไปที่เพจ
                    </a>
                </div>
            </div>
        </div>
      </section>

      {/* --- เกี่ยวกับเรา --- */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
            <div className="flex flex-col lg:flex-row gap-16 items-start">
                
                {/* Left: Images */}
                <div className="relative w-full lg:w-1/2">
                    <div className="rounded-[2.5rem] overflow-hidden shadow-2xl">
                        <img 
                            src={profileSetting.aboutImage1Url} 
                            className="w-full h-[500px] object-cover hover:scale-105 transition duration-700" 
                            alt="Badminton Court" 
                            onError={(e) => { (e.target as HTMLImageElement).src = 'https://i.pinimg.com/1200x/e3/b8/89/e3b8892a83a2cb1738291fa31ad32a1c.jpg'; }}
                        />
                    </div>
                    <div className="absolute -bottom-12 -right-6 md:-right-12 w-2/3 rounded-[2rem] overflow-hidden shadow-2xl border-8 border-white hidden md:block">
                        <img 
                            src={profileSetting.aboutImage2Url} 
                            className="w-full h-[300px] object-cover hover:scale-105 transition duration-700" 
                            alt="Badminton Action" 
                            onError={(e) => { (e.target as HTMLImageElement).src = 'https://i.pinimg.com/736x/1b/98/b7/1b98b7b809d1fb90c76bcf0d892adb7d.jpg'; }}
                        />
                    </div>
                </div>

                {/* Right: Content */}
                <div className="w-full lg:w-1/2 lg:pl-8 pt-8">
                    <span className="inline-block py-1.5 px-4 rounded-full bg-blue-100 text-blue-600 font-bold text-sm mb-6 border border-blue-200">
                        เกี่ยวกับเรา
                    </span>
                    
                    <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-8 leading-tight">
                        จุดนัดพบของคนรักแบดมินตัน
                    </h2>
                    
                    <div className="text-slate-500 leading-loose text-lg mb-10 space-y-4 font-light">
                        <p>
                            สนามแบด <strong className="text-slate-700 font-medium">{profileSetting.siteName}</strong> ตั้งอยู่ใจกลางเมืองน่าน เรามุ่งมั่นให้บริการสนามมาตรฐานเพื่อให้คุณได้ออกกำลังกายอย่างมีความสุข
                        </p>
                        <ul className="space-y-3 mt-4">
                            <li className="flex items-center gap-3">
                                <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs">✓</span>
                                <span>คอร์ทแบดมาตรฐาน 6 คอร์ท 5 พื้นยาง 1 พื้นปูน</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs">✓</span>
                                <span>ไฟสว่างทั่วถึง อากาศถ่ายเทสะดวก ไม่ร้อนอบอ้าว</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs">✓</span>
                                <span>มีห้องน้ำ ห้องอาบน้ำ และที่จอดรถกว้างขวาง</span>
                            </li>
                        </ul>
                    </div>
                </div>

            </div>
        </div>
      </section>

      {/* --- ระเบียบการใช้สนาม --- */}
      <section className="py-20 bg-white border-t border-slate-100 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4">
            <div className="flex flex-col lg:flex-row gap-16 items-center">
                
                {/* Content Left */}
                <div className="w-full lg:w-3/5 order-2 lg:order-1">
                    <div className="mb-8">
                        <span className="inline-block py-1.5 px-4 rounded-full bg-orange-50 text-orange-600 font-bold text-sm mb-4 border border-orange-100">
                            ข้อตกลงและเงื่อนไข
                        </span>
                        <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900">ระเบียบการใช้สนาม</h2>
                    </div>

                    <div className="relative">
                      {/* กล่องรายการกฎ: ล็อคความสูงและ Scroll ภายในกล่อง ไม่ให้หน้าเว็บยืดยาว */}
                      <div className="space-y-4 max-h-[450px] overflow-y-auto pr-3 custom-scrollbar scroll-smooth">
                        {rules.map((rule, idx) => (
                          <div
                            key={rule.id || idx}
                            className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex gap-4 hover:shadow-md transition"
                          >
                            <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center font-bold text-slate-600 shrink-0">
                              {rule.orderNumber || idx + 1}
                            </div>
                            <div>
                              <h4 className="font-bold text-lg text-slate-800 mb-2">
                                {rule.title}
                              </h4>
                              <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
                                {rule.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {rules.length > 3 && (
                        <div className="mt-3 flex items-center justify-between text-xs text-slate-400 px-1">
                          <span>ทั้งหมด {rules.length} ข้อ</span>
                          <span className="inline-flex items-center gap-1 font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                            เลื่อนในกล่องเพื่ออ่านข้อถัดไป
                          </span>
                        </div>
                      )}
                    </div>

                    {/* ข้อมูลบัญชี */}
                    <div className="mt-10 bg-blue-50 p-8 rounded-3xl border border-blue-100 text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-blue-100 rounded-full -mr-10 -mt-10 opacity-50"></div>
                        <div className="absolute bottom-0 left-0 w-16 h-16 bg-blue-200 rounded-full -ml-8 -mb-8 opacity-50"></div>
                        
                        <p className="text-blue-800 font-bold mb-4 text-lg relative z-10">ช่องทางการชำระเงิน</p>
                        <div className="bg-white p-6 rounded-2xl shadow-sm inline-block w-full max-w-md relative z-10">
                                <div className="text-slate-500 text-xs font-bold uppercase mb-1">พร้อมเพย์ PromptPay ({paymentSetting.bankName})</div>
                                <div className="text-2xl font-extrabold text-blue-600 tracking-wider font-mono">{formattedPromptPay}</div>
                                <div className="text-slate-700 font-medium mt-1">ชื่อบัญชี: {paymentSetting.accountName}</div>
                        </div>
                    </div>
                </div>

                {/* Right: Beautiful Image */}
                <div className="w-full lg:w-2/5 order-1 lg:order-2 mb-10 lg:mb-0 relative">
                    <div className="relative rounded-[3rem] overflow-hidden shadow-2xl border-[10px] border-white rotate-3 hover:rotate-0 transition-transform duration-500 ease-out cursor-pointer group">
                        <img 
                            src={profileSetting.rulesImageUrl} 
                            className="w-full h-[600px] object-cover filter brightness-95 group-hover:brightness-105 group-hover:scale-105 transition-all duration-700" 
                            alt="Badminton Court Rules" 
                            onError={(e) => { (e.target as HTMLImageElement).src = 'https://i.pinimg.com/736x/3b/07/70/3b077015daefe8c84e501d2b418fa37d.jpg'; }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-transparent to-transparent"></div>
                        <div className="absolute bottom-8 left-0 right-0 text-center px-6">
                            <span className="inline-block bg-white/20 backdrop-blur-md border border-white/30 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                                Fair Play & Safety
                            </span>
                        </div>
                    </div>
                    {/* Decorative Elements */}
                    <div className="absolute -z-10 top-10 -right-10 w-32 h-32 bg-orange-200 rounded-full blur-3xl opacity-60 animate-pulse"></div>
                    <div className="absolute -z-10 bottom-10 -left-10 w-40 h-40 bg-blue-200 rounded-full blur-3xl opacity-60 animate-pulse delay-700"></div>
                </div>

            </div>
        </div>
      </section>

      {/* --- Footer --- */}
      <footer className="bg-slate-900 text-white py-12 mt-10 rounded-t-[3rem]">
        <div className="max-w-7xl mx-auto px-4 text-center">
            <div className="text-2xl font-bold mb-4">{profileSetting.siteName}</div>
            <p className="text-slate-400 mb-8 max-w-lg mx-auto">{profileSetting.slogan}</p>
            
            <div className="flex justify-center gap-6 mb-8">
                <a href={contactSetting.facebookUrl} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition">Facebook</a>
                <a href={contactSetting.lineUrl} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition">Line</a>
                <a href={`tel:${contactSetting.phoneNumber.replace(/[^0-9]/g, '') || contactSetting.phoneNumber}`} className="text-slate-400 hover:text-white transition">{contactSetting.phoneNumber}</a>
            </div>

            <div className="mb-4">
                <Link href="/login" className="text-xs text-slate-600 hover:text-slate-400 transition bg-slate-800 px-3 py-1.5 rounded-full">
                    สำหรับเจ้าหน้าที่ดูแลระบบ
                </Link>
            </div>

            <div className="text-sm text-slate-600 pt-8 border-t border-slate-800">
                © 2026 Santiphap Badminton. All rights reserved.
            </div>
        </div>
      </footer>

    </div>
  );
}