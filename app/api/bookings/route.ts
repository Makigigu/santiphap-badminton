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

// 1. GET: ดึงข้อมูลการจองทั้งหมด
export async function GET() {
  try {
    const bookings = await prisma.booking.findMany({
      include: { court: true }, 
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(bookings);
  } catch (error) {
    return NextResponse.json({ error: 'Error fetching bookings' }, { status: 500 });
  }
}

// 2. PATCH: แก้ไขสถานะ
export async function PATCH(request: Request) {
  try {
    const { id, status, date, startTime, courtId, slipUrl } = await request.json();
    const dataToUpdate: any = {};
    
    if (status) dataToUpdate.status = status;
    if (date) dataToUpdate.date = new Date(date);
    if (startTime) dataToUpdate.startTime = startTime;
    if (courtId) dataToUpdate.courtId = parseInt(courtId);
    if (slipUrl) dataToUpdate.slipUrl = slipUrl; 

    const updatedBooking = await prisma.booking.update({
      where: { id: id },
      data: dataToUpdate,
    });
    return NextResponse.json(updatedBooking);
  } catch (error) {
    return NextResponse.json({ error: 'Update Failed' }, { status: 500 });
  }
}

// 3. POST: สร้างการจองใหม่
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customerName, phoneNumber, date, startTime, price, slipUrl, courtId } = body;

    // 3.1 หาข้อมูลสนามก่อน
    const court = await prisma.court.findUnique({
        where: { id: Number(courtId) }
    });

    if (!court) {
        return NextResponse.json({ error: 'Court not found' }, { status: 400 });
    }

    // 3.2 เช็คจองซ้อน
    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        courtId: Number(courtId),
        date: new Date(date),
        startTime: startTime, 
        status: { notIn: ['rejected', 'cancelled', 'REJECTED', 'CANCELLED'] } // แก้ไขเพิ่มสถานะให้ครอบคลุม
      }
    });

    if (conflictingBooking) {
      return NextResponse.json({ error: 'เสียใจด้วย! ช่วงเวลานี้ถูกจองตัดหน้าไปแล้ว' }, { status: 409 });
    }

    // 3.3 บันทึกการจอง
    const newBooking = await prisma.booking.create({
      data: {
        customerName,
        phoneNumber,
        date: new Date(date),
        startTime,
        price: Number(price),
        slipUrl: slipUrl || null,
        status: 'PENDING',
        courtId: court.id,
      },
    });

    // 3.4 ส่ง LINE Notify
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

    sendLineNotify(msg);

    return NextResponse.json(newBooking);
  } catch (error) {
    console.error("Booking Error:", error);
    return NextResponse.json({ error: 'Error creating booking' }, { status: 500 });
  }
}

// ✅ 4. DELETE: ลบรายการจอง (เพิ่มใหม่)
export async function DELETE(request: Request) {
  try {
    const { id, mode } = await request.json();

    if (mode === 'ALL') {
      // กรณีลบทั้งหมด (Delete All) - ระวัง! ข้อมูลหายหมด
      await prisma.booking.deleteMany({}); 
      return NextResponse.json({ message: 'Deleted all bookings' });
    } 
    else if (id) {
      // กรณีลบทีละรายการ
      await prisma.booking.delete({
        where: { id: String(id) },
      });
      return NextResponse.json({ message: 'Deleted successfully' });
    }

    return NextResponse.json({ error: 'Missing ID or Mode' }, { status: 400 });
  } catch (error) {
    console.error("Delete Error:", error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}