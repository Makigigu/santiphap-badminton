import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const DEFAULT_RULES = [
  {
    title: 'การจองและชำระเงิน',
    description:
      'เมื่อทำการจองแล้ว ต้องโอนชำระเงินเต็มจำนวนทันที พร้อมแนบสลิปเพื่อยืนยันสิทธิ์ หากไม่ดำเนินการเป็นเวลา 30 นาที ระบบจะยกเลิกการจองทันที',
    orderNumber: 1,
    isActive: true,
  },
  {
    title: 'การเลื่อน/ยกเลิก',
    description:
      'ต้องการเลื่อนวัน ต้องแจ้งล่วงหน้าอย่างน้อย 1 วัน (ก่อน 22:00 น.) สามารถเลื่อนได้ 1 ครั้งภายในเดือนเดียวกัน สงวนสิทธิ์ไม่คืนเงินทุกกรณี',
    orderNumber: 2,
    isActive: true,
  },
  {
    title: 'มารยาทการใช้สนาม',
    description:
      'กรุณาสวมรองเท้ากีฬาแบดมินตันเท่านั้น เพื่อรักษาพื้นสนาม และออกจากคอร์ทเมื่อหมดเวลาจอง เพื่อให้ลูกค้าท่านถัดไปได้ใช้บริการ',
    orderNumber: 3,
    isActive: true,
  },
];

// 1. GET: ดึงรายการกฎทั้งหมด
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';

    // ตรวจสอบว่ามีข้อมูลในฐานข้อมูลหรือยัง ถ้ายังไม่มี ให้สร้างข้อมูลเริ่มต้น 3 ข้อ
    const count = await prisma.courtRule.count();
    if (count === 0) {
      await prisma.courtRule.createMany({
        data: DEFAULT_RULES,
      });
    }

    const whereClause = activeOnly ? { isActive: true } : {};
    const rules = await prisma.courtRule.findMany({
      where: whereClause,
      orderBy: { orderNumber: 'asc' },
    });

    return NextResponse.json(rules);
  } catch (error) {
    console.error('Error fetching court rules:', error);
    return NextResponse.json({ error: 'Failed to fetch rules' }, { status: 500 });
  }
}

// 2. POST: สร้างกฎใหม่
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, orderNumber, isActive } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'กรุณากรอกหัวข้อกฎ' }, { status: 400 });
    }
    if (!description || !description.trim()) {
      return NextResponse.json({ error: 'กรุณากรอกรายละเอียดกฎ' }, { status: 400 });
    }

    let finalOrder = Number(orderNumber);
    if (isNaN(finalOrder) || finalOrder <= 0) {
      const highest = await prisma.courtRule.findFirst({
        orderBy: { orderNumber: 'desc' },
      });
      finalOrder = (highest?.orderNumber ?? 0) + 1;
    }

    const newRule = await prisma.courtRule.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        orderNumber: finalOrder,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });

    return NextResponse.json(newRule, { status: 201 });
  } catch (error) {
    console.error('Create rule error:', error);
    return NextResponse.json({ error: 'Failed to create rule' }, { status: 500 });
  }
}

// 3. PATCH: อัปเดตข้อมูลกฎ
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, title, description, orderNumber, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'ไม่พบ ID ของกฎที่ต้องการแก้ไข' }, { status: 400 });
    }

    const dataToUpdate: any = {};
    if (title !== undefined) dataToUpdate.title = title.trim();
    if (description !== undefined) dataToUpdate.description = description.trim();
    if (orderNumber !== undefined) dataToUpdate.orderNumber = Number(orderNumber);
    if (isActive !== undefined) dataToUpdate.isActive = Boolean(isActive);

    const updatedRule = await prisma.courtRule.update({
      where: { id: Number(id) },
      data: dataToUpdate,
    });

    return NextResponse.json(updatedRule);
  } catch (error) {
    console.error('Update rule error:', error);
    return NextResponse.json({ error: 'Failed to update rule' }, { status: 500 });
  }
}

// 4. DELETE: ลบกฎ
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');

    if (!id) {
      const body = await request.json().catch(() => null);
      if (body?.id) id = body.id;
    }

    if (!id) {
      return NextResponse.json({ error: 'ไม่พบ ID ของกฎที่ต้องการลบ' }, { status: 400 });
    }

    await prisma.courtRule.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ success: true, message: 'ลบกฎสำเร็จ' });
  } catch (error) {
    console.error('Delete rule error:', error);
    return NextResponse.json({ error: 'Failed to delete rule' }, { status: 500 });
  }
}
