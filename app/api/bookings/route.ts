import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendLineNotification } from '@/lib/line'; // Import ฟังก์ชันส่งไลน์แบบใหม่

export const dynamic = 'force-dynamic';

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
        status: { notIn: ['rejected', 'cancelled', 'REJECTED', 'CANCELLED'] }
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

    // 3.4 ส่ง LINE Messaging API (แบบ Flex Message)
    const formattedDate = new Date(date).toLocaleDateString('th-TH', {
        year: 'numeric', month: 'long', day: 'numeric'
    });

    // สร้างข้อมูล Flex Message
    const flexMessage = {
      "type": "bubble",
      "hero": {
        "type": "image",
        "url": "https://img.freepik.com/free-vector/badminton-player-action-cartoon-graphic-vector_40876-2679.jpg", // หารูปสวยๆ มาใส่
        "size": "full",
        "aspectRatio": "20:13",
        "aspectMode": "cover"
      },
      "body": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "text",
            "text": "รายการจองใหม่! 🏸",
            "weight": "bold",
            "size": "xl",
            "color": "#1DB446"
          },
          {
            "type": "box",
            "layout": "vertical",
            "margin": "lg",
            "spacing": "sm",
            "contents": [
              {
                "type": "box",
                "layout": "baseline",
                "contents": [
                  { "type": "text", "text": "ลูกค้า", "color": "#aaaaaa", "size": "sm", "flex": 2 },
                  { "type": "text", "text": customerName, "wrap": true, "color": "#666666", "size": "sm", "flex": 5 }
                ]
              },
              {
                "type": "box",
                "layout": "baseline",
                "contents": [
                  { "type": "text", "text": "เบอร์โทร", "color": "#aaaaaa", "size": "sm", "flex": 2 },
                  { "type": "text", "text": phoneNumber, "wrap": true, "color": "#666666", "size": "sm", "flex": 5 }
                ]
              },
              {
                "type": "box",
                "layout": "baseline",
                "contents": [
                  { "type": "text", "text": "สนาม", "color": "#aaaaaa", "size": "sm", "flex": 2 },
                  { "type": "text", "text": court.name, "wrap": true, "color": "#666666", "size": "sm", "flex": 5 }
                ]
              },
              {
                "type": "box",
                "layout": "baseline",
                "contents": [
                  { "type": "text", "text": "เวลา", "color": "#aaaaaa", "size": "sm", "flex": 2 },
                  { "type": "text", "text": `${formattedDate} (${startTime} น.)`, "wrap": true, "color": "#666666", "size": "sm", "flex": 5 }
                ]
              },
              {
                "type": "box",
                "layout": "baseline",
                "contents": [
                  { "type": "text", "text": "ยอดเงิน", "color": "#aaaaaa", "size": "sm", "flex": 2 },
                  { "type": "text", "text": `${price} บาท`, "weight": "bold", "color": "#333333", "size": "sm", "flex": 5 }
                ]
              }
            ]
          }
        ]
      },
      "footer": {
        "type": "box",
        "layout": "vertical",
        "spacing": "sm",
        "contents": [
          {
            "type": "button",
            "style": "primary",
            "height": "sm",
            "action": {
              "type": "uri",
              "label": "ตรวจสอบในระบบ",
              "uri": "https://santiphap-badminton.vercel.app/admin" // ลิงก์ไปยังหน้า Admin ของคุณ
            }
          }
        ]
      }
    };

    // ส่งข้อความ (Fire and Forget)
    sendLineNotification(`มีรายการจองใหม่จากคุณ ${customerName}`, flexMessage);

    return NextResponse.json(newBooking);
  } catch (error) {
    console.error("Booking Error:", error);
    return NextResponse.json({ error: 'Error creating booking' }, { status: 500 });
  }
}

// 4. DELETE: ลบรายการจอง
export async function DELETE(request: Request) {
  try {
    const { id, mode } = await request.json();

    if (mode === 'ALL') {
      await prisma.booking.deleteMany({}); 
      return NextResponse.json({ message: 'Deleted all bookings' });
    } 
    else if (id) {
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