import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function DELETE() {
  try {
    // 1. คำนวณเวลา 30 นาทีที่แล้ว
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    // 2. สั่งลบรายการที่:
    // - สถานะเป็น PENDING (ยังไม่จ่าย)
    // - สร้างก่อนเวลา 30 นาทีที่แล้ว (เก่ากว่า)
    const result = await prisma.booking.deleteMany({
      where: {
        status: 'PENDING',
        createdAt: {
          lt: thirtyMinutesAgo, // lt = Less Than (น้อยกว่าเวลาที่กำหนด)
        },
      },
    });

    return NextResponse.json({ 
        message: 'Cleanup successful', 
        deletedCount: result.count // ส่งจำนวนที่ลบกลับไปบอกหน้าบ้าน
    });

  } catch (error) {
    console.error("Cleanup Error:", error);
    return NextResponse.json({ error: 'Failed to cleanup' }, { status: 500 });
  }
}