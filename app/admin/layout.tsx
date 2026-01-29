'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    // ลบ Cookie โดยการตั้งเวลาหมดอายุเป็นอดีต
    document.cookie = "admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.push('/login');
  };

  const menuItems = [
    { name: '📊 ภาพรวม (Dashboard)', path: '/admin' },
    { name: '📅 ประวัติการจอง', path: '/admin/bookings' },
    { name: '⚙️ ตั้งค่าสนาม/ราคา', path: '/admin/settings' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col md:flex-row">
      
      {/* Sidebar เมนูทางซ้าย */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex-shrink-0 md:h-screen sticky top-0 z-50">
        <div className="p-6 border-b border-slate-800">
          <div className="text-xl font-extrabold tracking-tight">
            สันติภาพ<span className="text-blue-400">BackOffice</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">ระบบจัดการสนามแบดมินตัน</div>
        </div>

        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link 
                key={item.path} 
                href={item.path}
                className={`block px-4 py-3 rounded-xl transition font-bold text-sm ${
                    isActive 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 mt-auto border-t border-slate-800">
           <button 
             onClick={handleLogout}
             className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-600 hover:text-white transition font-bold text-sm"
           >
             <span>🚪</span> ออกจากระบบ
           </button>
        </div>
      </aside>

      {/* Main Content เนื้อหาด้านขวา */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
         {children}
      </main>

    </div>
  );
}