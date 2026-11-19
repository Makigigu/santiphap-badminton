import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const DEFAULT_PAYMENT = {
  promptPayId: process.env.NEXT_PUBLIC_PROMPTPAY_ID || '0640388696',
  accountName: process.env.NEXT_PUBLIC_PROMPTPAY_NAME || 'นายมงคลชัย ต๊อดแก้ว',
  bankName: process.env.NEXT_PUBLIC_PROMPTPAY_BANK || 'ธนาคารกรุงไทย',
};

// 1. GET: ดึงข้อมูลการตั้งค่าบัญชีรับเงิน (PromptPay)
export async function GET() {
  try {
    let setting = await prisma.paymentSetting.findUnique({
      where: { id: 1 },
    });

    // หากยังไม่มีข้อมูลใน DB ให้สร้างค่าเริ่มต้น
    if (!setting || !setting.promptPayId) {
      setting = await prisma.paymentSetting.upsert({
        where: { id: 1 },
        update: {
          promptPayId: DEFAULT_PAYMENT.promptPayId,
          accountName: DEFAULT_PAYMENT.accountName,
          bankName: DEFAULT_PAYMENT.bankName,
        },
        create: {
          id: 1,
          promptPayId: DEFAULT_PAYMENT.promptPayId,
          accountName: DEFAULT_PAYMENT.accountName,
          bankName: DEFAULT_PAYMENT.bankName,
        },
      });
    }

    return NextResponse.json({
      promptPayId: setting.promptPayId,
      accountName: setting.accountName || DEFAULT_PAYMENT.accountName,
      bankName: setting.bankName || DEFAULT_PAYMENT.bankName,
    });
  } catch (error) {
    console.error('Fetch payment settings error:', error);
    // ในกรณีเกิด Error ให้คืนค่า Default เพื่อไม่ให้หน้าเว็บล่ม
    return NextResponse.json(DEFAULT_PAYMENT);
  }
}

// 2. PATCH: แอดมินแก้ไขข้อมูลบัญชีรับเงิน (PromptPay)
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { promptPayId, accountName, bankName } = body;

    if (!promptPayId || !String(promptPayId).trim()) {
      return NextResponse.json(
        { error: 'กรุณาระบุหมายเลขพร้อมเพย์ (เบอร์โทร หรือ เลขบัตรประชาชน)' },
        { status: 400 }
      );
    }

    if (!accountName || !String(accountName).trim()) {
      return NextResponse.json(
        { error: 'กรุณาระบุชื่อ-นามสกุล เจ้าของบัญชี' },
        { status: 400 }
      );
    }

    if (!bankName || !String(bankName).trim()) {
      return NextResponse.json(
        { error: 'กรุณาระบุชื่อธนาคาร' },
        { status: 400 }
      );
    }

    const cleanPromptPayId = String(promptPayId).replace(/[^0-9]/g, '').trim();

    if (cleanPromptPayId.length !== 10 && cleanPromptPayId.length !== 13) {
      return NextResponse.json(
        { error: 'หมายเลขพร้อมเพย์ต้องเป็นเบอร์โทรศัพท์ 10 หลัก หรือเลขบัตรประชาชน 13 หลัก' },
        { status: 400 }
      );
    }

    const updated = await prisma.paymentSetting.upsert({
      where: { id: 1 },
      update: {
        promptPayId: cleanPromptPayId,
        accountName: String(accountName).trim(),
        bankName: String(bankName).trim(),
      },
      create: {
        id: 1,
        promptPayId: cleanPromptPayId,
        accountName: String(accountName).trim(),
        bankName: String(bankName).trim(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'บันทึกข้อมูลบัญชีรับเงินสำเร็จ',
      data: {
        promptPayId: updated.promptPayId,
        accountName: updated.accountName,
        bankName: updated.bankName,
      },
    });
  } catch (error) {
    console.error('Update payment settings error:', error);
    return NextResponse.json(
      { error: 'บันทึกข้อมูลบัญชีไม่สำเร็จ' },
      { status: 500 }
    );
  }
}
