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