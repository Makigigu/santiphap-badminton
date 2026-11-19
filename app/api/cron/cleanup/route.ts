import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function performCleanup() {
  // กำหนดเวลา Deadline คือ 30 นาทีที่แล้ว
  const deadline = new Date(Date.now() - 30 * 60 * 1000);

  // ลบรายการที่ยังค้างสถานะ 'PENDING' หรือ 'pending' และสร้างไว้นานกว่า 30 นาที
  const result = await prisma.booking.deleteMany({
    where: {
      status: { in: ['PENDING', 'pending'] },
      createdAt: {
        lt: deadline,
      },
    },
  });

  return {
    success: true,
    message: `ล้างรายการขยะเรียบร้อย (${result.count} รายการ)`,
    deletedCount: result.count,
  };
}

export async function GET() {
  try {
    const data = await performCleanup();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Cron cleanup error:', error);
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const data = await performCleanup();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Cron cleanup error:', error);
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}
