import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'ไม่พบไฟล์รูปภาพที่อัปโหลด' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'รองรับเฉพาะไฟล์รูปภาพ (JPG, PNG, WEBP, GIF)' }, { status: 400 });
    }

    // จำกัดขนาดไฟล์ไม่เกิน 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'ขนาดไฟล์เกิน 10MB กรุณาเลือกไฟล์ที่เล็กลง' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const cleanExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? ext : 'jpg';
    const filename = `site_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${cleanExt}`;

    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, buffer);

    const publicUrl = `/uploads/${filename}`;
    return NextResponse.json({ success: true, url: publicUrl });
  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการบันทึกรูปภาพ' }, { status: 500 });
  }
}
