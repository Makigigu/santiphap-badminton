import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: 'ออกจากระบบสำเร็จ',
  });

  response.cookies.set({
    name: 'admin_token',
    value: '',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });

  return response;
}
