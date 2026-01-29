// src/app/api/bookings/history/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const phone = searchParams.get('phone');

  if (!phone) {
    return NextResponse.json([]); // ถ้าไม่มีเบอร์โทร ส่ง array ว่างกลับไป
  }

  try {
    const bookings = await prisma.booking.findMany({
      where: {
        phoneNumber: phone, // ค้นหาตามเบอร์โทร
      },
      include: {
        court: true, // ดึงชื่อสนามมาด้วย
      },
      orderBy: {
        createdAt: 'desc', // เรียงจากล่าสุดไปเก่าสุด
      },
    });
    
    return NextResponse.json(bookings);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching history' }, { status: 500 });
  }
}