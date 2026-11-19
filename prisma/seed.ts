import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // 1. ลบข้อมูลเก่าทิ้งก่อน (เพื่อไม่ให้ข้อมูลซ้ำ)
  await prisma.court.deleteMany()
  await prisma.admin.deleteMany()

  // 2. สร้างข้อมูลสนาม 1-6
  await prisma.court.createMany({
    data: [
      { name: "COURT 1", type: "พื้นยางมาตรฐาน", price: 180 },
      { name: "COURT 2", type: "พื้นยางมาตรฐาน", price: 180 },
      { name: "COURT 3", type: "พื้นยางมาตรฐาน", price: 180 },
      { name: "COURT 4", type: "พื้นยางมาตรฐาน", price: 180 },
      { name: "COURT 5", type: "พื้นยางมาตรฐาน", price: 180 },
      { name: "COURT 6", type: "พื้นยางสังเคราะห์ PU", price: 150 },
    ],
  })

  // 3. สร้าง Admin สำหรับ Login
  await prisma.admin.create({
    data: {
      username: "admin",
      password: "1234", // รหัสผ่านง่ายๆ (ในงานจริงควรเข้ารหัส)
    },
  })

  // 4. สร้างกฎระเบียบเริ่มต้น
  await prisma.courtRule.deleteMany()
  await prisma.courtRule.createMany({
    data: [
      {
        title: "การจองและชำระเงิน",
        description: "เมื่อทำการจองแล้ว ต้องโอนชำระเงินเต็มจำนวนทันที พร้อมแนบสลิปเพื่อยืนยันสิทธิ์ หากไม่ดำเนินการเป็นเวลา 30 นาที ระบบจะยกเลิกการจองทันที",
        orderNumber: 1,
        isActive: true,
      },
      {
        title: "การเลื่อน/ยกเลิก",
        description: "ต้องการเลื่อนวัน ต้องแจ้งล่วงหน้าอย่างน้อย 1 วัน (ก่อน 22:00 น.) สามารถเลื่อนได้ 1 ครั้งภายในเดือนเดียวกัน สงวนสิทธิ์ไม่คืนเงินทุกกรณี",
        orderNumber: 2,
        isActive: true,
      },
      {
        title: "มารยาทการใช้สนาม",
        description: "กรุณาสวมรองเท้ากีฬาแบดมินตันเท่านั้น เพื่อรักษาพื้นสนาม และออกจากคอร์ทเมื่อหมดเวลาจอง เพื่อให้ลูกค้าท่านถัดไปได้ใช้บริการ",
        orderNumber: 3,
        isActive: true,
      },
    ],
  })


  console.log('✅ Seed data created! (ใส่ข้อมูลสำเร็จแล้ว)')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })