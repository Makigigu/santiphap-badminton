import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' },
        { status: 400 }
      );
    }

    const cleanUsername = String(username).trim();
    const cleanPassword = String(password).trim();

    // 1. ตรวจสอบกับ Environment Variables ก่อน
    const envUser = process.env.ADMIN_USER || 'admin';
    const envPass = process.env.ADMIN_PASSWORD || '1234';

    let isAuthenticated = cleanUsername === envUser && cleanPassword === envPass;

    // 2. ถ้ายังไม่ผ่าน ให้ตรวจสอบกับฐานข้อมูลตาราง Admin
    if (!isAuthenticated) {
      const adminRecord = await prisma.admin.findUnique({
        where: { username: cleanUsername },
      });

      if (adminRecord && adminRecord.password === cleanPassword) {
        isAuthenticated = true;
      }
    }

    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    // สร้าง Response พร้อมตั้ง Cookie
    const response = NextResponse.json({
      success: true,
      message: 'เข้าสู่ระบบสำเร็จ',
    });

    response.cookies.set({
      name: 'admin_token',
      value: 'true',
      path: '/',
      maxAge: 86400, // 1 วัน
      httpOnly: false, // เพื่อให้หน้าบ้านอ่านสถานะได้
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' },
      { status: 500 }
    );
  }
}
