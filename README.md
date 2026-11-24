# Santiphap Badminton Court Reservation Web Application
> ระบบจองคอร์ทแบดมินตันออนไลน์และจัดการสนามครบวงจร (สันติภาพ แบดมินตัน จ.น่าน)

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-38B2AC?style=for-the-badge&logo=tailwind-css)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma)
![TiDB](https://img.shields.io/badge/Database-TiDB%20Cloud-EA580C?style=for-the-badge)

---

## เกี่ยวกับโปรเจกต์ (Project Overview)
Santiphap Badminton Court Reservation Web Application เป็นระบบเว็บแอปพลิเคชันที่พัฒนาขึ้นเพื่ออำนวยความสะดวกในการจองคอร์ทแบดมินตันสำหรับลูกค้า พร้อมระบบ BackOffice หลังบ้านสำหรับเจ้าหน้าที่สนาม ช่วยลดความซ้ำซ้อนของการจอง รองรับการชำระเงินผ่านระบบ PromptPay QR Code อัตโนมัติ และแจ้งเตือนผ่าน LINE ทันทีเมื่อมีการทำรายการ

---

## เทคโนโลยีที่ใช้ (Tech Stack)

| ส่วนประกอบ | เทคโนโลยี |
| :--- | :--- |
| **Frontend Framework** | [Next.js 15](https://nextjs.org/) (App Router), [React 19](https://react.dev/) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) |
| **Database & ORM** | [Prisma ORM](https://www.prisma.io/), [TiDB Cloud](https://www.pingcap.com/tidb-cloud/) (Serverless MySQL) |
| **Payment Integration** | [promptpay-qr](https://www.npmjs.com/package/promptpay-qr), [qrcode](https://www.npmjs.com/package/qrcode) |
| **Data Visualization** | [Recharts](https://recharts.org/) |
| **Notification** | [LINE Bot SDK](https://github.com/line/line-bot-sdk-nodejs) (Messaging API) |

---

## เริ่มต้นใช้งานในเครื่อง (Getting Started)

### 1. โคลนโปรเจกต์
```bash
git clone https://github.com/Makigigu/santiphap-badminton.git
cd santiphap-badminton/smashhub-web
```

### 2. ติดตั้ง Dependencies
```bash
npm install
```

### 3. ตั้งค่า Environment Variables (.env)
สร้างไฟล์ `.env` ที่โฟลเดอร์ `smashhub-web` และระบุค่าดังนี้:
```env
DATABASE_URL="mysql://<user>:<password>@<host>:4000/<dbname>?sslaccept=strict"

# Admin Setup
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="your-password"

# PromptPay (เบอร์โทรหรือเลขบัตรประชาชน, ชื่อบัญชี, ชื่อธนาคาร)
NEXT_PUBLIC_PROMPTPAY_ID="your-promptpay-id"
NEXT_PUBLIC_PROMPTPAY_NAME="your-account-name"
NEXT_PUBLIC_PROMPTPAY_BANK="your-bank-name"

# LINE Bot API (ถ้ามี)
LINE_CHANNEL_ACCESS_TOKEN="your-access-token"
```

### 4. ซิงค์ฐานข้อมูลและรัน Server
```bash
npx prisma generate
npm run dev
```
เปิดบราวเซอร์ไปที่ [http://localhost:3000](http://localhost:3000)

---

## License
This project is licensed under the MIT License - see the LICENSE file for details.
