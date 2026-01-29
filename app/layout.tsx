import type { Metadata } from "next";
import { Mitr } from "next/font/google"; // 1. นำเข้าฟอนต์ Mitr
import "./globals.css";

// 2. ตั้งค่าฟอนต์ (เลือกความหนาที่ต้องการ)
const mitr = Mitr({
  weight: ['200', '300', '400', '500', '600', '700'], // โหลดมาหลายๆ ขนาด
  subsets: ['thai', 'latin'], // รองรับภาษาไทยและอังกฤษ
  display: 'swap',
  variable: '--font-mitr', // ตั้งชื่อตัวแปรเผื่อใช้ใน Tailwind
});

export const metadata: Metadata = {
  title: "SmashHub - จองสนามแบดมินตัน",
  description: "Web application for badminton booking",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      {/* 3. เรียกใช้ฟอนต์ที่ body */}
      <body className={`${mitr.className} antialiased bg-gray-50 text-slate-900`}>
        {children}
      </body>
    </html>
  );
}