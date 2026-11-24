import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const DEFAULT_CONTACT = {
  phoneNumber: '064-038-8696',
  openTime: '08:00 - 22:00 น.',
  lineId: '@SantiphapBad',
  lineUrl: 'https://line.me/R/ti/p/@915avwsq',
  facebookName: 'ติดตามข่าวสารต่างๆ',
  facebookUrl: 'https://www.facebook.com/profile.php?id=100069056293502',
};

// 1. GET: ดึงข้อมูลช่องทางการติดต่อ
export async function GET() {
  try {
    let setting = await prisma.contactSetting.findUnique({
      where: { id: 1 },
    });

    if (!setting || !setting.phoneNumber) {
      setting = await prisma.contactSetting.upsert({
        where: { id: 1 },
        update: {
          phoneNumber: DEFAULT_CONTACT.phoneNumber,
          openTime: DEFAULT_CONTACT.openTime,
          lineId: DEFAULT_CONTACT.lineId,
          lineUrl: DEFAULT_CONTACT.lineUrl,
          facebookName: DEFAULT_CONTACT.facebookName,
          facebookUrl: DEFAULT_CONTACT.facebookUrl,
        },
        create: {
          id: 1,
          phoneNumber: DEFAULT_CONTACT.phoneNumber,
          openTime: DEFAULT_CONTACT.openTime,
          lineId: DEFAULT_CONTACT.lineId,
          lineUrl: DEFAULT_CONTACT.lineUrl,
          facebookName: DEFAULT_CONTACT.facebookName,
          facebookUrl: DEFAULT_CONTACT.facebookUrl,
        },
      });
    }

    return NextResponse.json({
      phoneNumber: setting.phoneNumber || DEFAULT_CONTACT.phoneNumber,
      openTime: setting.openTime || DEFAULT_CONTACT.openTime,
      lineId: setting.lineId || DEFAULT_CONTACT.lineId,
      lineUrl: setting.lineUrl || DEFAULT_CONTACT.lineUrl,
      facebookName: setting.facebookName || DEFAULT_CONTACT.facebookName,
      facebookUrl: setting.facebookUrl || DEFAULT_CONTACT.facebookUrl,
    });
  } catch (error) {
    console.error('Fetch contact settings error:', error);
    return NextResponse.json(DEFAULT_CONTACT);
  }
}

// 2. PATCH: แอดมินแก้ไขข้อมูลช่องทางการติดต่อ
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const {
      phoneNumber,
      openTime,
      lineId,
      lineUrl,
      facebookName,
      facebookUrl,
    } = body;

    if (!phoneNumber || !String(phoneNumber).trim()) {
      return NextResponse.json(
        { error: 'กรุณากรอกหมายเลขโทรศัพท์' },
        { status: 400 }
      );
    }

    if (!lineUrl || !String(lineUrl).trim()) {
      return NextResponse.json(
        { error: 'กรุณากรอกลิงก์แอดไลน์' },
        { status: 400 }
      );
    }

    if (!facebookUrl || !String(facebookUrl).trim()) {
      return NextResponse.json(
        { error: 'กรุณากรอกลิงก์เพจ Facebook' },
        { status: 400 }
      );
    }

    const updated = await prisma.contactSetting.upsert({
      where: { id: 1 },
      update: {
        phoneNumber: String(phoneNumber).trim(),
        openTime: openTime ? String(openTime).trim() : DEFAULT_CONTACT.openTime,
        lineId: lineId ? String(lineId).trim() : DEFAULT_CONTACT.lineId,
        lineUrl: String(lineUrl).trim(),
        facebookName: facebookName
          ? String(facebookName).trim()
          : DEFAULT_CONTACT.facebookName,
        facebookUrl: String(facebookUrl).trim(),
      },
      create: {
        id: 1,
        phoneNumber: String(phoneNumber).trim(),
        openTime: openTime ? String(openTime).trim() : DEFAULT_CONTACT.openTime,
        lineId: lineId ? String(lineId).trim() : DEFAULT_CONTACT.lineId,
        lineUrl: String(lineUrl).trim(),
        facebookName: facebookName
          ? String(facebookName).trim()
          : DEFAULT_CONTACT.facebookName,
        facebookUrl: String(facebookUrl).trim(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'บันทึกข้อมูลช่องทางการติดต่อสำเร็จ',
      data: updated,
    });
  } catch (error) {
    console.error('Update contact settings error:', error);
    return NextResponse.json(
      { error: 'บันทึกข้อมูลช่องทางการติดต่อไม่สำเร็จ' },
      { status: 500 }
    );
  }
}
