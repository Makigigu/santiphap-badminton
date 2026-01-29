import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ต้องมีบรรทัดนี้!
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');

    if (!phone) {
      return NextResponse.json([]);
    }

    const bookings = await prisma.booking.findMany({
      where: {
        phoneNumber: { contains: phone },
      },
      include: {
        court: true,
      },
      orderBy: {
        date: 'desc',
      },
    });
    
    return NextResponse.json(bookings);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching history' }, { status: 500 });
  }
}