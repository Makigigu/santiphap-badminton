import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// --- ฟังก์ชันสำหรับส่ง LINE Notify ---
async function sendLineNotify(message: string) {
  const token = process.env.LINE_NOTIFY_TOKEN;
  if (!token) return;

  try {
    const formData = new URLSearchParams();
    formData.append('message', message);
    
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

// 1. GET: ดึงข้อมูลการจองทั้งหมด (ใช้เช็คตารางว่าว่างไหม)
export async function GET() {
  try {
    const bookings = await prisma.booking.findMany({
      include: { court: true }, // ดึงข้อมูลสนามมาด้วย
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(bookings);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching bookings' }, { status: 500 });
  }
}

// 2. PATCH: แก้ไขสถานะ (ใช้ตอน Admin กดยืนยัน หรือ User แนบสลิป)
export async function PATCH(request: Request) {
  try {
    const { id, status, date, startTime, courtId, slipUrl } = await request.json();
    const dataToUpdate: any = {};
    
    if (status) dataToUpdate.status = status;
    if (date) dataToUpdate.date = new Date(date);
    if (startTime) dataToUpdate.startTime = startTime;
    if (courtId) dataToUpdate.courtId = parseInt(courtId);
    if (slipUrl) dataToUpdate.slipUrl = slipUrl; // รองรับการอัปเดตสลิปทีหลัง

    const updatedBooking = await prisma.booking.update({
      where: { id: id },
      data: dataToUpdate,
    });
    return NextResponse.json(updatedBooking);
  } catch (error) {
    return NextResponse.json({ error: 'Update Failed' }, { status: 500 });
  }
}

// 3. POST: สร้างการจองใหม่ (จองทันทีเมื่อกดปุ่มยืนยัน)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    // รับ courtId โดยตรง ไม่ต้องไปตัด String จากชื่อสนามแล้ว
    const { customerName, phoneNumber, date, startTime, price, slipUrl, courtId } = body;

    // 3.1 หาข้อมูลสนามก่อน (เพื่อเอาชื่อสนามไปส่ง LINE)
    const court = await prisma.court.findUnique({
        where: { id: Number(courtId) }
    });

    if (!court) {
        return NextResponse.json({ error: 'Court not found' }, { status: 400 });
    }

    // 3.2 เช็คจองซ้อน (Double Booking Check)
    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        courtId: Number(courtId),
        date: new Date(date),
        startTime: startTime, // เช็คเวลาชนกันเป๊ะๆ
        status: { not: 'rejected' } // ถ้ายังไม่ถูกปฏิเสธ ถือว่าไม่ว่าง
      }
    });

    if (conflictingBooking) {
      return NextResponse.json({ error: 'เสียใจด้วย! ช่วงเวลานี้ถูกจองตัดหน้าไปแล้ว' }, { status: 409 });
    }

    // 3.3 บันทึกการจอง (สถานะ PENDING) -> สนามจะเป็นสีแดงทันที
    const newBooking = await prisma.booking.create({
      data: {
        customerName,
        phoneNumber,
        date: new Date(date),
        startTime,
        price: Number(price),
        slipUrl: slipUrl || null, // ถ้ายังไม่มีสลิป (จองก่อนจ่าย) ให้เป็น null
        status: 'PENDING',
        courtId: court.id,
      },
    });

    // 3.4 ส่ง LINE Notify (แจ้งเตือนว่ามีการจองเข้ามา)
    const formattedDate = new Date(date).toLocaleDateString('th-TH', {
        year: 'numeric', month: 'long', day: 'numeric'
    });
    
    const msg = `
📣 มีรายการจองใหม่! (รอชำระเงิน)
👤 ลูกค้า: ${customerName}
📞 เบอร์: ${phoneNumber}
🏟️ สนาม: ${court.name}
📅 วันที่: ${formattedDate}
⏰ เวลา: ${startTime} น.
💰 ยอดเงิน: ${price} บาท
สถานะ: รอตรวจสอบ (Pending)
`.trim();

    // ไม่ต้อง await ก็ได้ เพื่อให้ API ตอบกลับเร็วๆ
    sendLineNotify(msg);

    return NextResponse.json(newBooking);
  } catch (error) {
    console.error("Booking Error:", error);
    return NextResponse.json({ error: 'Error creating booking' }, { status: 500 });
  }
}