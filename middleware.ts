import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  // 1. ตรวจสอบเมื่อเข้าหน้า /admin
  if (req.nextUrl.pathname.startsWith('/admin')) {
    
    // 2. เช็คว่ามี Cookie ชื่อ "admin_token" หรือไม่?
    // (Cookie นี้เราฝังไว้ตอนกดปุ่ม Login สำเร็จ)
    const token = req.cookies.get('admin_token');

    if (token && token.value === 'true') {
      // ถ้ามี Cookie -> อนุญาตให้ผ่านไปได้
      return NextResponse.next();
    }

    // 3. ถ้าไม่มี Cookie -> ดีดกลับไปหน้า Login
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};