import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');

    if (!phone) {
      return NextResponse.json([]);
    }

    const cleanPhone = phone.replace(/\D/g, '').trim();
    if (!cleanPhone) {
      return NextResponse.json([]);
    }

    // ค้นหาด้วยเบอร์โทรที่ตรงกับ Index (ตัด slipUrl ออกเพื่อความเร็วสูงสุดและประหยัดเน็ต)
    const bookings = await prisma.booking.findMany({
      where: {
        OR: [
          { phoneNumber: cleanPhone },
          { phoneNumber: phone.trim() },
          { phoneNumber: { startsWith: cleanPhone } }
        ]
      },
      select: {
        id: true,
        customerName: true,
        phoneNumber: true,
        date: true,
        startTime: true,
        status: true,
        price: true,
        createdAt: true,
        courtId: true,
        court: {
          select: {
            id: true,
            name: true,
            type: true,
            price: true,
          }
        }
      },
      orderBy: {
        date: 'desc',
      },
      take: 100,
    });
    
    return NextResponse.json(bookings);
  } catch (error) {
    console.error("Error fetching history:", error);
    return NextResponse.json({ error: 'Error fetching history' }, { status: 500 });
  }
}