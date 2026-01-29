// src/app/api/closures/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ✅ เพิ่มบรรทัดนี้เพื่อแก้ปัญหา Build Error บน Vercel
export const dynamic = 'force-dynamic';

// เพิ่มช่วงเวลาปิด
export async function POST(request: Request) {
  try {
    const { courtId, startDate, endDate } = await request.json();
    
    const closure = await prisma.courtClosure.create({
      data: {
        courtId: parseInt(courtId),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
    });
    return NextResponse.json(closure);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add closure' }, { status: 500 });
  }
}

// ลบช่วงเวลาปิด
export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    await prisma.courtClosure.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}