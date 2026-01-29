import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ✅ บรรทัดนี้สำคัญมาก ห้ามลบ (แก้ปัญหา Deploy แล้ว Error)
export const dynamic = 'force-dynamic';

// 1. GET: ดึงข้อมูลสนามทั้งหมด
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

// 2. POST: สร้างสนามใหม่ (✅ เพิ่มส่วนนี้เพื่อให้ปุ่มเพิ่มสนามใช้งานได้)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, type, price } = body;

    const newCourt = await prisma.court.create({
      data: {
        name,
        type,
        price: Number(price), // แปลงเป็นตัวเลขให้ชัวร์
        openTime: "08:00",    // ค่าเริ่มต้นเวลาเปิด
        closeTime: "22:00",   // ค่าเริ่มต้นเวลาปิด
      },
    });
    return NextResponse.json(newCourt);
  } catch (error) {
    console.error("Create court error:", error);
    return NextResponse.json({ error: 'Failed to create court' }, { status: 500 });
  }
}

// 3. PATCH: อัปเดตข้อมูลสนาม (ราคา, วันปิด, ชื่อ, รายละเอียด)
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, price, closures, name, type } = body;

    // เตรียมข้อมูลที่จะอัปเดต
    const dataToUpdate: any = {};
    if (price !== undefined) dataToUpdate.price = Number(price); // แปลงเป็นตัวเลข
    if (name !== undefined) dataToUpdate.name = name;
    if (type !== undefined) dataToUpdate.type = type;

    // อัปเดตข้อมูลพื้นฐานสนาม
    const updatedCourt = await prisma.court.update({
      where: { id: Number(id) },
      data: dataToUpdate,
    });

    // ถ้ามีการส่งข้อมูลวันปิดปรับปรุงมาด้วย ให้จัดการตาราง Closures
    if (closures) {
        // ลบวันปิดเก่าออกทั้งหมดของสนามนี้
        await prisma.courtClosure.deleteMany({
            where: { courtId: Number(id) }
        });

        // สร้างรายการวันปิดใหม่
        if (closures.length > 0) {
            await prisma.courtClosure.createMany({
                data: closures.map((c: any) => ({
                    courtId: Number(id),
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