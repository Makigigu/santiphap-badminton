import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get('admin_token');
  const isAdmin = token && token.value === 'true';

  // 1. ตรวจสอบเมื่อเข้าหน้าเพจ /admin
  if (pathname.startsWith('/admin')) {
    if (isAdmin) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // 2. ป้องกัน API ฝั่งหลังบ้าน (Admin Operations Guard)
  const method = req.method;

  if (
    pathname.startsWith('/api/revenue') ||
    (pathname.startsWith('/api/courts') && method !== 'GET') ||
    (pathname.startsWith('/api/rules') && method !== 'GET') ||
    (pathname.startsWith('/api/closures') && method !== 'GET') ||
    (pathname.startsWith('/api/bookings') &&
      (method === 'PATCH' || method === 'DELETE') &&
      !pathname.includes('/cleanup'))
  ) {
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized: จำเป็นต้องเข้าสู่ระบบแอดมินก่อนดำเนินการ' },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/:path*'],
};
