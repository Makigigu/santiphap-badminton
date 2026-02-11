import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfMonth, endOfMonth, parseISO } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date'); // รับค่า yyyy-MM-dd

    // ถ้าไม่ส่งมา ให้ใช้เดือนปัจจุบัน
    const targetDate = dateParam ? new Date(dateParam) : new Date();

    // หาช่วงเวลา ต้นเดือน - สิ้นเดือน
    const startDate = startOfMonth(targetDate);
    const endDate = endOfMonth(targetDate);

    // ดึงข้อมูลเฉพาะที่ "จ่ายเงินแล้ว" (APPROVED หรือ COMPLETED)
    const bookings = await prisma.booking.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          in: ['APPROVED', 'COMPLETED', 'approved', 'completed'] 
        }
      },
      orderBy: {
        date: 'asc',
      }
    });

    return NextResponse.json(bookings);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch revenue' }, { status: 500 });
  }
}