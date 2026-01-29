import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET: ดึงข้อมูลสนามทั้งหมด
export async function GET() {
  try {
    const courts = await prisma.court.findMany({
      include: { closures: true },
      orderBy: { id: 'asc' },
    });
    return NextResponse.json(courts);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching courts' }, { status: 500 });
  }
}

// PATCH: อัปเดตข้อมูลสนาม (ราคา, วันปิด, *ชื่อ, *รายละเอียด)
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, price, closures, name, type } = body; // รับค่า name และ type เพิ่ม

    // 1. เตรียมข้อมูลที่จะอัปเดต
    const dataToUpdate: any = {};
    if (price !== undefined) dataToUpdate.price = price;
    if (name !== undefined) dataToUpdate.name = name;
    if (type !== undefined) dataToUpdate.type = type;

    // 2. อัปเดตข้อมูลสนาม (ชื่อ, ประเภท, ราคา)
    const updatedCourt = await prisma.court.update({
      where: { id },
      data: dataToUpdate,
    });

    // 3. ถ้ามีการส่งข้อมูลวันปิดปรับปรุงมาด้วย ให้จัดการตาราง Closures
    if (closures) {
        // ลบอันเก่าที่ user ลบออกจากหน้าเว็บ (หรือลบทั้งหมดแล้วสร้างใหม่ก็ได้ แต่วิธีนี้ง่ายกว่าสำหรับการจัดการ state)
        // เพื่อความง่าย: ลบ closure ทั้งหมดของสนามนี้ก่อน แล้วสร้างใหม่ตามที่ส่งมา
        // (วิธีนี้อาจไม่ optimized ที่สุดแต่ชัวร์เรื่องข้อมูลตรงกัน)
        await prisma.courtClosure.deleteMany({
            where: { courtId: id }
        });

        if (closures.length > 0) {
            await prisma.courtClosure.createMany({
                data: closures.map((c: any) => ({
                    courtId: id,
                    startDate: new Date(c.startDate),
                    endDate: new Date(c.endDate)
                }))
            });
        }
    }

    return NextResponse.json(updatedCourt);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}