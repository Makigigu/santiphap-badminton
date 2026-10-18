import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, getDaysInMonth, format } from 'date-fns';
import { th } from 'date-fns/locale';

export const dynamic = 'force-dynamic';

const THAI_MONTH_NAMES = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period'); // 'daily' | 'monthly' | 'yearly'
    const dateParam = searchParams.get('date');
    const yearParam = searchParams.get('year');
    const monthParam = searchParams.get('month');

    // 1. โหมดกราฟรายได้ (Chart Analytics Mode)
    if (period) {
      const now = new Date();
      const targetYear = yearParam ? parseInt(yearParam) : now.getFullYear();
      const targetMonth = monthParam !== null ? parseInt(monthParam) : now.getMonth(); // 0-indexed

      const validStatuses = ['APPROVED', 'COMPLETED', 'approved', 'completed'];

      // 1.1 รายวัน (Daily): แสดงรายได้ทุกวันในเดือนที่เลือก
      if (period === 'daily') {
        const targetDate = new Date(targetYear, targetMonth, 1);
        const startDate = startOfMonth(targetDate);
        const endDate = endOfMonth(targetDate);
        const daysCount = getDaysInMonth(targetDate);

        const bookings = await prisma.booking.findMany({
          where: {
            date: { gte: startDate, lte: endDate },
            status: { in: validStatuses }
          },
          select: { date: true, price: true }
        });

        // สรุปยอดตามวัน
        const dayMap: { [key: number]: { revenue: number, count: number } } = {};
        for (let i = 1; i <= daysCount; i++) {
          dayMap[i] = { revenue: 0, count: 0 };
        }

        bookings.forEach(b => {
          const d = new Date(b.date).getDate();
          if (dayMap[d]) {
            dayMap[d].revenue += b.price;
            dayMap[d].count += 1;
          }
        });

        const data = Object.keys(dayMap).map(dayStr => {
          const dayNum = parseInt(dayStr);
          return {
            name: `${dayNum}`,
            label: `${dayNum} ${THAI_MONTH_NAMES[targetMonth]}`,
            revenue: dayMap[dayNum].revenue,
            count: dayMap[dayNum].count
          };
        });

        const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
        const totalBookings = data.reduce((sum, item) => sum + item.count, 0);
        const activeDays = data.filter(d => d.revenue > 0).length;

        return NextResponse.json({
          period: 'daily',
          year: targetYear,
          month: targetMonth,
          monthLabel: `${THAI_MONTH_NAMES[targetMonth]} ${targetYear + 543}`,
          totalRevenue,
          totalBookings,
          averageRevenue: activeDays > 0 ? Math.round(totalRevenue / activeDays) : 0,
          data
        });
      }

      // 1.2 รายเดือน (Monthly): แสดงรายได้ 12 เดือนของปีที่เลือก
      if (period === 'monthly') {
        const targetDate = new Date(targetYear, 0, 1);
        const startDate = startOfYear(targetDate);
        const endDate = endOfYear(targetDate);

        const bookings = await prisma.booking.findMany({
          where: {
            date: { gte: startDate, lte: endDate },
            status: { in: validStatuses }
          },
          select: { date: true, price: true }
        });

        const monthMap: { [key: number]: { revenue: number, count: number } } = {};
        for (let m = 0; m < 12; m++) {
          monthMap[m] = { revenue: 0, count: 0 };
        }

        bookings.forEach(b => {
          const m = new Date(b.date).getMonth();
          if (monthMap[m]) {
            monthMap[m].revenue += b.price;
            monthMap[m].count += 1;
          }
        });

        const data = Object.keys(monthMap).map(mStr => {
          const mNum = parseInt(mStr);
          return {
            name: THAI_MONTH_NAMES[mNum],
            label: `${THAI_MONTH_NAMES[mNum]} ${targetYear + 543}`,
            revenue: monthMap[mNum].revenue,
            count: monthMap[mNum].count
          };
        });

        const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
        const totalBookings = data.reduce((sum, item) => sum + item.count, 0);
        const activeMonths = data.filter(m => m.revenue > 0).length;

        return NextResponse.json({
          period: 'monthly',
          year: targetYear,
          yearLabel: `${targetYear + 543}`,
          totalRevenue,
          totalBookings,
          averageRevenue: activeMonths > 0 ? Math.round(totalRevenue / activeMonths) : 0,
          data
        });
      }

      // 1.3 รายปี (Yearly): แสดงรายได้ย้อนหลังและล่วงหน้ารวม 5 ปี
      if (period === 'yearly') {
        const startYearNum = targetYear - 2;
        const endYearNum = targetYear + 2;

        const bookings = await prisma.booking.findMany({
          where: {
            status: { in: validStatuses }
          },
          select: { date: true, price: true }
        });

        const yearMap: { [key: number]: { revenue: number, count: number } } = {};
        for (let y = startYearNum; y <= endYearNum; y++) {
          yearMap[y] = { revenue: 0, count: 0 };
        }

        bookings.forEach(b => {
          const y = new Date(b.date).getFullYear();
          if (yearMap[y] !== undefined) {
            yearMap[y].revenue += b.price;
            yearMap[y].count += 1;
          }
        });

        const data = Object.keys(yearMap).map(yStr => {
          const yNum = parseInt(yStr);
          return {
            name: `${yNum + 543}`,
            label: `ปี พ.ศ. ${yNum + 543}`,
            revenue: yearMap[yNum].revenue,
            count: yearMap[yNum].count
          };
        });

        const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
        const totalBookings = data.reduce((sum, item) => sum + item.count, 0);

        return NextResponse.json({
          period: 'yearly',
          totalRevenue,
          totalBookings,
          data
        });
      }
    }

    // 2. โหมดเดิม (Backward Compatibility สำหรับหน้ารายงานประจำเดือน Report)
    const targetDate = dateParam ? new Date(dateParam) : new Date();
    const startDate = startOfMonth(targetDate);
    const endDate = endOfMonth(targetDate);

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
    console.error("Revenue API error:", error);
    return NextResponse.json({ error: 'Failed to fetch revenue' }, { status: 500 });
  }
}