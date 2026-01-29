import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    // กำหนดเวลา Deadline คือ 30 นาทีที่แล้ว
    const deadline = new Date(Date.now() - 30 * 60 * 1000);

    // ลบรายการที่ยังสถานะ 'pending' และสร้างไว้นานกว่า 30 นาที
    const result = await prisma.booking.deleteMany({
      where: {
        status: 'pending',
        createdAt: {
          lt: deadline,
        },
      },
    });

    return NextResponse.json({ 
        success: true, 
        message: `ล้างรายการขยะเรียบร้อย (${result.count} รายการ)` 
    });
  } catch (error) {
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}