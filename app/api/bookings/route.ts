import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendLineNotification } from '@/lib/line'; // Import ฟังก์ชันส่งไลน์แบบใหม่

export const dynamic = 'force-dynamic';

// 1. GET: ดึงข้อมูลการจอง (ปรับปรุงความเร็วสูงสุด: ตัด slipUrl ออกหากไม่ใช่แอดมิน, รองรับ dashboard mode และกรองตามวันที่/สถานะ)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const statusParam = searchParams.get('status');
    const includeSlip = searchParams.get('includeSlip') === 'true';
    const forDashboard = searchParams.get('dashboard') === 'true';

    // 1.1 โหมด Dashboard: ดึงเฉพาะวันนี้ (สำหรับผังสนาม/ยอดวันนี้) + รายการที่รอตรวจสลิป (PAID_VERIFY, PENDING)
    // ตัด slipUrl ออกจากรายการที่ไม่ใช่ PAID_VERIFY/PENDING เพื่อลดขนาด Payload จากหลาย MB เหลือระดับ KB
    if (forDashboard) {
      const now = new Date();
      const todayStr = searchParams.get('today') || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const startOfToday = new Date(`${todayStr}T00:00:00.000Z`);
      const endOfToday = new Date(`${todayStr}T23:59:59.999Z`);

      const bookings = await prisma.booking.findMany({
        where: {
          OR: [
            { date: { gte: startOfToday, lte: endOfToday } },
            { status: { in: ['PAID_VERIFY', 'PENDING'] } }
          ]
        },
        select: {
          id: true,
          customerName: true,
          phoneNumber: true,
          date: true,
          startTime: true,
          status: true,
          price: true,
          slipUrl: true,
          createdAt: true,
          courtId: true,
          court: {
            select: {
              id: true,
              name: true,
              type: true,
              price: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
      });

      // ส่ง slipUrl เฉพาะรายการที่ต้องตรวจสลิป เพื่อความเร็วในการส่งข้อมูลสูงสุด
      const optimized = bookings.map(b => {
        const isPending = b.status === 'PAID_VERIFY' || b.status === 'PENDING';
        return {
          ...b,
          slipUrl: isPending ? b.slipUrl : null
        };
      });

      return NextResponse.json(optimized);
    }

    const where: any = {};
    if (dateParam) {
      const startOfDay = new Date(`${dateParam}T00:00:00.000Z`);
      const endOfDay = new Date(`${dateParam}T23:59:59.999Z`);
      where.date = { gte: startOfDay, lte: endOfDay };
    }

    if (statusParam && statusParam !== 'all') {
      where.status = statusParam;
    }

    // กรณีทั่วไป (เช่น หน้าจองคอร์ด หรือตรวจสอบสถานะ): ตัด slipUrl ทิ้งเพื่อลดขนาด Payload จากหลาย MB เหลือเพียงไม่กี่ KB
    if (!includeSlip) {
      const bookings = await prisma.booking.findMany({
        where,
        select: {
          id: true,
          customerName: true,
          phoneNumber: true,
          date: true,
          startTime: true,
          status: true,
          price: true,
          createdAt: true,
          courtId: true,
          court: {
            select: {
              id: true,
              name: true,
              type: true,
              price: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json(bookings);
    }

    // กรณี Admin ที่ต้องการดูสลิป (includeSlip=true): ดึงข้อมูลครบถ้วน
    // หากไม่มีการกรองวันที่ ให้ดึงล่าสุด 100 รายการเพื่อป้องกัน Memory Overload
    const bookings = await prisma.booking.findMany({
      where,
      include: { court: true }, 
      orderBy: { createdAt: 'desc' },
      take: dateParam ? undefined : 150,
    });
    return NextResponse.json(bookings);
  } catch (error) {
    console.error("Fetch bookings error:", error);
    return NextResponse.json({ error: 'Error fetching bookings' }, { status: 500 });
  }
}

// 2. PATCH: แก้ไขสถานะ (รองรับทั้งรายการเดี่ยว id และรายการแบบกลุ่ม ids เพื่อความรวดเร็ว)
export async function PATCH(request: Request) {
  try {
    const { id, ids, status, date, startTime, courtId, slipUrl } = await request.json();
    
    // ตรวจสอบว่ามี ID หรือ IDs หรือไม่
    if (!id && (!Array.isArray(ids) || ids.length === 0)) {
      return NextResponse.json({ error: 'Missing Booking ID or IDs' }, { status: 400 });
    }    
    const dataToUpdate: any = {};
    if (status) dataToUpdate.status = status;
    if (date) dataToUpdate.date = new Date(date);
    if (startTime) dataToUpdate.startTime = startTime;
    if (courtId) dataToUpdate.courtId = parseInt(courtId);
    if (slipUrl) dataToUpdate.slipUrl = slipUrl; 

    // อัปเดตแบบกลุ่มรวดเดียว (Batch Update) ลดจำนวนรอบการยิง Database
    if (Array.isArray(ids) && ids.length > 0) {
      const result = await prisma.booking.updateMany({
        where: { id: { in: ids } },
        data: dataToUpdate,
      });
      return NextResponse.json({ success: true, count: result.count });
    }

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

// 4. DELETE: ลบรายการจอง (รองรับทั้งเดี่ยว id และกลุ่ม ids)
export async function DELETE(request: Request) {
  try {
    const { id, ids, mode } = await request.json();

    if (mode === 'ALL') {
      await prisma.booking.deleteMany({}); 
      return NextResponse.json({ message: 'Deleted all bookings' });
    } 
    else if (Array.isArray(ids) && ids.length > 0) {
      const result = await prisma.booking.deleteMany({
        where: { id: { in: ids } },
      });
      return NextResponse.json({ message: 'Deleted multiple successfully', count: result.count });
    }
    else if (id) {
      await prisma.booking.delete({
        where: { id: String(id) },
      });
      return NextResponse.json({ message: 'Deleted successfully' });
    }

    return NextResponse.json({ error: 'Missing ID, IDs or Mode' }, { status: 400 });
  } catch (error) {
    console.error("Delete Error:", error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}