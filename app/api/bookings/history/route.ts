// src/app/api/bookings/history/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ✅ เพิ่มบรรทัดนี้เพื่อแก้ปัญหา Build Error บน Vercel ค่ะ
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');

    if (!phone) {
      return NextResponse.json([]); // ถ้าไม่มีเบอร์โทร ส่ง array ว่างกลับไป
    }

    const bookings = await prisma.booking.findMany({
      where: {
        // ใช้ contains เพื่อให้ค้นหาเจอแม้พิมพ์ไม่ครบ (Optional) หรือจะใช้แบบเดิมก็ได้
        phoneNumber: { contains: phone }, 
      },
      include: {
        court: true, // ดึงชื่อสนามมาด้วย
      },
      orderBy: {
        date: 'desc', // แนะนำให้เรียงตาม "วันที่จอง" (ล่าสุดอยู่บน) จะดูง่ายกว่า createdAt ค่ะ
      },
    });
    
    return NextResponse.json(bookings);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching history' }, { status: 500 });
  }
}