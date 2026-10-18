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
    // ตรวจสอบว่ามี ID หรือไม่ (จำเป็นสำหรับการอัปเดต)
    if (!id) {
      return NextResponse.json({ error: 'Missing Booking ID' }, { status: 400 });
    }    
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
    console.error("Update Error:", error);
    return NextResponse.json({ error: 'Update Failed' }, { status: 500 });
  }
}

// 3. POST: สร้างการจองใหม่
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customerName, phoneNumber, date, slipUrl } = body;

    // รองรับทั้งแบบส่ง Array ของ slots (Batch จองหลายช่วงเวลาพร้อมกัน) และแบบเดิม (Single slot)
    type SlotItem = {
      courtId: number | string;
      startTime: string;
      price: number | string;
      slipUrl?: string | null;
      status?: string;
    };

    let items: SlotItem[] = [];
    if (Array.isArray(body.slots) && body.slots.length > 0) {
      items = body.slots;
    } else if (body.courtId && body.startTime) {
      items = [{
        courtId: body.courtId,
        startTime: body.startTime,
        price: body.price ?? 0,
        slipUrl: body.slipUrl,
        status: body.status,
      }];
    } else {
      return NextResponse.json({ error: 'Missing booking details' }, { status: 400 });
    }

    // 3.1 หาข้อมูลสนามทั้งหมดที่เกี่ยวข้อง
    const courtIds = Array.from(new Set(items.map(i => Number(i.courtId))));
    const courts = await prisma.court.findMany({
      where: { id: { in: courtIds } }
    });
    const courtMap = new Map(courts.map(c => [c.id, c]));

    for (const cId of courtIds) {
      if (!courtMap.has(cId)) {
        return NextResponse.json({ error: `ไม่พบข้อมูลสนาม ID ${cId}` }, { status: 400 });
      }
    }

    // 3.2 ตรวจสอบการจองซ้อนของทุกช่วงเวลาพร้อมกัน
    const conflictConditions = items.map(slot => ({
      courtId: Number(slot.courtId),
      date: new Date(date),
      startTime: slot.startTime,
      status: { notIn: ['rejected', 'cancelled', 'REJECTED', 'CANCELLED'] }
    }));

    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        OR: conflictConditions
      },
      include: { court: true }
    });

    if (conflictingBooking) {
      const courtName = conflictingBooking.court?.name?.replace('COURT', 'สนาม') || `สนาม ${conflictingBooking.courtId}`;
      return NextResponse.json({ 
        error: `เสียใจด้วย! ${courtName} (${conflictingBooking.startTime}) ถูกจองตัดหน้าไปแล้ว` 
      }, { status: 409 });
    }

    // 3.3 บันทึกการจองทั้งหมดลง Database (Transaction)
    const bookingCreates = items.map(slot => 
      prisma.booking.create({
        data: {
          customerName,
          phoneNumber,
          date: new Date(date),
          startTime: slot.startTime,
          price: Number(slot.price || 0),
          slipUrl: slot.slipUrl || slipUrl || null,
          status: slot.status || body.status || 'PENDING',
          courtId: Number(slot.courtId),
        },
        include: { court: true }
      })
    );

    const newBookings = await prisma.$transaction(bookingCreates);

    // 3.4 ส่ง LINE Messaging API เพียง 1 ครั้ง รวมทุกรายการ
    if (body.notify !== false) {
      const dateForDisplay = date.includes('T') ? date : `${date}T00:00:00`;
      const formattedDate = new Date(dateForDisplay).toLocaleDateString('th-TH', {
        year: 'numeric', month: 'long', day: 'numeric'
      });

      const totalPrice = items.reduce((sum, item) => sum + Number(item.price || 0), 0);

      // จัดกลุ่มช่วงเวลาตามสนามเพื่อแสดงผลใน Flex Message
      const courtSlotMap = new Map<string, string[]>();
      items.forEach(slot => {
        const c = courtMap.get(Number(slot.courtId));
        const courtName = c ? c.name.replace('COURT', 'สนาม') : `สนาม ${slot.courtId}`;
        if (!courtSlotMap.has(courtName)) {
          courtSlotMap.set(courtName, []);
        }
        courtSlotMap.get(courtName)!.push(slot.startTime);
      });

      const bookingItemContents: any[] = [];
      courtSlotMap.forEach((times, courtName) => {
        bookingItemContents.push({
          type: "box",
          layout: "baseline",
          contents: [
            { type: "text", text: courtName, color: "#64748b", size: "sm", weight: "bold", flex: 2 },
            { type: "text", text: times.join(', ') + " น.", wrap: true, color: "#1e293b", size: "sm", flex: 5 }
          ]
        });
      });

      const flexMessage = {
        type: "bubble",
        hero: {
          type: "image",
          url: "https://i.pinimg.com/736x/16/c2/4f/16c24ff98518a954ee4a7058e9de91c4.jpg",
          size: "full",
          aspectRatio: "20:13",
          aspectMode: "cover"
        },
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: "รายการจองใหม่! 🏸",
              weight: "bold",
              size: "xl",
              color: "#1DB446"
            },
            {
              type: "box",
              layout: "vertical",
              margin: "lg",
              spacing: "sm",
              contents: [
                {
                  type: "box",
                  layout: "baseline",
                  contents: [
                    { type: "text", text: "ลูกค้า", color: "#aaaaaa", size: "sm", flex: 2 },
                    { type: "text", text: customerName, wrap: true, color: "#333333", weight: "bold", size: "sm", flex: 5 }
                  ]
                },
                {
                  type: "box",
                  layout: "baseline",
                  contents: [
                    { type: "text", text: "เบอร์โทร", color: "#aaaaaa", size: "sm", flex: 2 },
                    { type: "text", text: phoneNumber, wrap: true, color: "#333333", size: "sm", flex: 5 }
                  ]
                },
                {
                  type: "box",
                  layout: "baseline",
                  contents: [
                    { type: "text", text: "วันที่", color: "#aaaaaa", size: "sm", flex: 2 },
                    { type: "text", text: formattedDate, wrap: true, color: "#333333", size: "sm", flex: 5 }
                  ]
                },
                {
                  type: "separator",
                  margin: "md"
                },
                {
                  type: "box",
                  layout: "vertical",
                  margin: "md",
                  spacing: "xs",
                  contents: bookingItemContents
                },
                {
                  type: "separator",
                  margin: "md"
                },
                {
                  type: "box",
                  layout: "baseline",
                  margin: "md",
                  contents: [
                    { type: "text", text: `ราคารวม (${items.length} รายการ)`, color: "#64748b", size: "sm", flex: 3 },
                    { type: "text", text: `${totalPrice.toLocaleString()} บาท`, weight: "bold", color: "#2563eb", size: "md", align: "end", flex: 4 }
                  ]
                }
              ]
            }
          ]
        },
        footer: {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          contents: [
            {
              type: "button",
              style: "primary",
              height: "sm",
              action: {
                type: "uri",
                label: "ตรวจสอบในระบบ",
                uri: "https://santiphap-badminton.vercel.app/admin"
              }
            }
          ]
        }
      };

      sendLineNotification(`มีรายการจองใหม่จากคุณ ${customerName} (${items.length} รายการ)`, flexMessage);
    }

    // ถ้าเรียกแบบเดิม (1 รายการ) ให้ return ตัวแรกเพื่อ backward compatibility
    if (!Array.isArray(body.slots)) {
      return NextResponse.json(newBookings[0]);
    }

    // ถ้าเรียกแบบ batch (slots)
    return NextResponse.json({
      success: true,
      id: newBookings[0].id,
      ids: newBookings.map(b => b.id),
      bookings: newBookings
    });

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