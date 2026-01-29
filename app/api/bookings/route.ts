import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// --- ฟังก์ชันสำหรับส่ง LINE Notify ---
async function sendLineNotify(message: string, imageUrl?: string | null) {
  const token = process.env.LINE_NOTIFY_TOKEN;
  if (!token) return;

  try {
    const formData = new URLSearchParams();
    formData.append('message', message);
    
    // if (imageUrl) {
    //    formData.append('imageThumbnail', imageUrl);
    //    formData.append('imageFullsize', imageUrl);
    // }

    await fetch('https://notify-api.line.me/api/notify', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });
  } catch (error) {
    console.error('Line Notify Error:', error);
  }
}

// GET: ดึงข้อมูล
export async function GET() {
  try {
    const bookings = await prisma.booking.findMany({
      include: { court: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(bookings);
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

// PATCH: แก้ไขสถานะ
export async function PATCH(request: Request) {
  try {
    const { id, status, date, startTime, courtId } = await request.json();
    const dataToUpdate: any = {};
    if (status) dataToUpdate.status = status;
    if (date) dataToUpdate.date = new Date(date);
    if (startTime) dataToUpdate.startTime = startTime;
    if (courtId) dataToUpdate.courtId = parseInt(courtId);

    const updatedBooking = await prisma.booking.update({
      where: { id: id },
      data: dataToUpdate,
    });
    return NextResponse.json(updatedBooking);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// POST: จองสนาม (แก้ไขจุดตัดคำ courtName)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customerName, phoneNumber, date, startTime, price, slipUrl, courtName } = body;

    // 🔥 แก้ไขตรงนี้: ตัด string ด้วยเครื่องหมายจุลภาค (,) แล้วเอาตัวแรกสุด
    // เพื่อแก้ปัญหา "สนาม 1, สนาม 1, สนาม 1" ให้เหลือแค่ "สนาม 1"
    const targetCourtName = courtName.split(',')[0].trim();

    // ค้นหาโดยใช้ชื่อที่ตัดคำแล้ว
    const court = await prisma.court.findFirst({
        where: { name: { contains: targetCourtName } } 
    });

    if (!court) {
        // Log ดูว่าค่าที่ส่งมา vs ค่าที่เอาไปหา คืออะไร (ช่วย debug)
        console.error(`Original: "${courtName}" -> Target: "${targetCourtName}" -> Not Found`);
        return NextResponse.json({ error: 'Court not found' }, { status: 400 });
    }

    // เช็คจองซ้อน
    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        courtId: court.id,
        date: new Date(date),
        // สถานะต้องไม่ใช่ rejected และ cancelled
        status: { notIn: ['rejected', 'cancelled'] }, 
        startTime: { contains: startTime.split(',')[0].trim() } 
      }
    });

    if (conflictingBooking) {
      return NextResponse.json({ error: 'ขออภัย ช่วงเวลานี้ถูกจองไปแล้ว' }, { status: 409 });
    }

    // บันทึกการจอง
    const newBooking = await prisma.booking.create({
      data: {
        customerName, phoneNumber,
        date: new Date(date),
        startTime, price, slipUrl,
        status: 'pending',
        courtId: court.id,
      },
    });

    // ส่ง LINE Notify
    const msg = `
🏸 มีรายการจองใหม่!
👤 ลูกค้า: ${customerName}
📞 เบอร์: ${phoneNumber}
🏟️ สนาม: ${courtName}
📅 วันที่: ${new Date(date).toLocaleDateString('th-TH')}
⏰ เวลา: ${startTime}
💰 ยอดเงิน: ${price} บาท
สถานะ: รอตรวจสอบ (Pending)
`.trim();

    sendLineNotify(msg);

    return NextResponse.json(newBooking);
  } catch (error) {
    console.error("Booking Error:", error);
    return NextResponse.json({ error: 'Error creating booking' }, { status: 500 });
  }
}