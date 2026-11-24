import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const DEFAULT_FEATURES = [
  'คอร์ทแบดมาตรฐาน 6 คอร์ท 5 พื้นยาง 1 พื้นปูน',
  'ไฟสว่างทั่วถึง อากาศถ่ายเทสะดวก ไม่ร้อนอบอ้าว',
  'มีห้องน้ำ ห้องอาบน้ำ และที่จอดรถกว้างขวาง',
];

const DEFAULT_PROFILE = {
  siteName: 'สันติภาพแบดมินตัน',
  slogan: 'สนามแบดมินตันมาตรฐาน จังหวัด น่าน',
  description: 'สนามพื้นยางมาตรฐาน ไฟสว่าง มีสิ่งอำนวยความสะดวก พร้อมจองออนไลน์ 24 ชั่วโมง',
  logoUrl: '/logo.jpg',
  heroImageUrl: '/CBadminton.jpg',
  aboutTitle: 'จุดนัดพบของคนรักแบดมินตัน',
  aboutDesc: 'สนามแบด สันติภาพ แบดมินตัน ตั้งอยู่ใจกลางเมืองน่าน เรามุ่งมั่นให้บริการสนามมาตรฐานเพื่อให้คุณได้ออกกำลังกายอย่างมีความสุข',
  aboutFeatures: DEFAULT_FEATURES,
  aboutFeature1: DEFAULT_FEATURES[0],
  aboutFeature2: DEFAULT_FEATURES[1],
  aboutFeature3: DEFAULT_FEATURES[2],
  aboutImage1Url: 'https://i.pinimg.com/1200x/e3/b8/89/e3b8892a83a2cb1738291fa31ad32a1c.jpg',
  aboutImage2Url: 'https://i.pinimg.com/736x/1b/98/b7/1b98b7b809d1fb90c76bcf0d892adb7d.jpg',
  rulesImageUrl: 'https://i.pinimg.com/736x/3b/07/70/3b077015daefe8c84e501d2b418fa37d.jpg',
};

// 1. GET: ดึงข้อมูลโปรไฟล์และรูปภาพหน้าหลัก
export async function GET() {
  try {
    let setting = await prisma.siteProfileSetting.findUnique({
      where: { id: 1 },
    });

    if (!setting) {
      setting = await prisma.siteProfileSetting.upsert({
        where: { id: 1 },
        update: {
          siteName: DEFAULT_PROFILE.siteName,
          slogan: DEFAULT_PROFILE.slogan,
          description: DEFAULT_PROFILE.description,
          logoUrl: DEFAULT_PROFILE.logoUrl,
          heroImageUrl: DEFAULT_PROFILE.heroImageUrl,
          aboutTitle: DEFAULT_PROFILE.aboutTitle,
          aboutDesc: DEFAULT_PROFILE.aboutDesc,
          aboutFeature1: DEFAULT_PROFILE.aboutFeature1,
          aboutFeature2: DEFAULT_PROFILE.aboutFeature2,
          aboutFeature3: DEFAULT_PROFILE.aboutFeature3,
          aboutFeatures: JSON.stringify(DEFAULT_PROFILE.aboutFeatures),
          aboutImage1Url: DEFAULT_PROFILE.aboutImage1Url,
          aboutImage2Url: DEFAULT_PROFILE.aboutImage2Url,
          rulesImageUrl: DEFAULT_PROFILE.rulesImageUrl,
        },
        create: {
          id: 1,
          siteName: DEFAULT_PROFILE.siteName,
          slogan: DEFAULT_PROFILE.slogan,
          description: DEFAULT_PROFILE.description,
          logoUrl: DEFAULT_PROFILE.logoUrl,
          heroImageUrl: DEFAULT_PROFILE.heroImageUrl,
          aboutTitle: DEFAULT_PROFILE.aboutTitle,
          aboutDesc: DEFAULT_PROFILE.aboutDesc,
          aboutFeature1: DEFAULT_PROFILE.aboutFeature1,
          aboutFeature2: DEFAULT_PROFILE.aboutFeature2,
          aboutFeature3: DEFAULT_PROFILE.aboutFeature3,
          aboutFeatures: JSON.stringify(DEFAULT_PROFILE.aboutFeatures),
          aboutImage1Url: DEFAULT_PROFILE.aboutImage1Url,
          aboutImage2Url: DEFAULT_PROFILE.aboutImage2Url,
          rulesImageUrl: DEFAULT_PROFILE.rulesImageUrl,
        },
      });
    }

    let parsedFeatures: string[] = DEFAULT_FEATURES;
    if (setting.aboutFeatures && setting.aboutFeatures.trim()) {
      try {
        const arr = JSON.parse(setting.aboutFeatures);
        if (Array.isArray(arr) && arr.length > 0) {
          parsedFeatures = arr;
        }
      } catch (e) {
        // fallback
      }
    } else if (setting.aboutFeature1 || setting.aboutFeature2 || setting.aboutFeature3) {
      parsedFeatures = [
        setting.aboutFeature1,
        setting.aboutFeature2,
        setting.aboutFeature3,
      ].filter(Boolean);
    }

    return NextResponse.json({
      siteName: setting.siteName || DEFAULT_PROFILE.siteName,
      slogan: setting.slogan || DEFAULT_PROFILE.slogan,
      description: setting.description || DEFAULT_PROFILE.description,
      logoUrl: setting.logoUrl || DEFAULT_PROFILE.logoUrl,
      heroImageUrl: setting.heroImageUrl || DEFAULT_PROFILE.heroImageUrl,
      aboutTitle: setting.aboutTitle || DEFAULT_PROFILE.aboutTitle,
      aboutDesc: setting.aboutDesc || DEFAULT_PROFILE.aboutDesc,
      aboutFeatures: parsedFeatures,
      aboutFeature1: parsedFeatures[0] || '',
      aboutFeature2: parsedFeatures[1] || '',
      aboutFeature3: parsedFeatures[2] || '',
      aboutImage1Url: setting.aboutImage1Url || DEFAULT_PROFILE.aboutImage1Url,
      aboutImage2Url: setting.aboutImage2Url || DEFAULT_PROFILE.aboutImage2Url,
      rulesImageUrl: setting.rulesImageUrl || DEFAULT_PROFILE.rulesImageUrl,
    });
  } catch (error) {
    console.error('Fetch profile settings error:', error);
    return NextResponse.json(DEFAULT_PROFILE);
  }
}

// 2. PATCH: แอดมินแก้ไขข้อมูลโปรไฟล์และรูปภาพหน้าหลัก
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const {
      siteName,
      slogan,
      description,
      logoUrl,
      heroImageUrl,
      aboutTitle,
      aboutDesc,
      aboutFeatures,
      aboutImage1Url,
      aboutImage2Url,
      rulesImageUrl,
    } = body;

    let featuresArray: string[] = [];
    if (Array.isArray(aboutFeatures)) {
      featuresArray = aboutFeatures
        .map((f: unknown) => (typeof f === 'string' ? f.trim() : ''))
        .filter((f: string) => f.length > 0);
    } else {
      featuresArray = DEFAULT_FEATURES;
    }

    const featuresJson = JSON.stringify(featuresArray);

    const updated = await prisma.siteProfileSetting.upsert({
      where: { id: 1 },
      update: {
        siteName: siteName !== undefined ? String(siteName).trim() : DEFAULT_PROFILE.siteName,
        slogan: slogan !== undefined ? String(slogan).trim() : DEFAULT_PROFILE.slogan,
        description: description !== undefined ? String(description).trim() : DEFAULT_PROFILE.description,
        logoUrl: logoUrl ? String(logoUrl).trim() : DEFAULT_PROFILE.logoUrl,
        heroImageUrl: heroImageUrl ? String(heroImageUrl).trim() : DEFAULT_PROFILE.heroImageUrl,
        aboutTitle: aboutTitle !== undefined ? String(aboutTitle).trim() : DEFAULT_PROFILE.aboutTitle,
        aboutDesc: aboutDesc !== undefined ? String(aboutDesc).trim() : DEFAULT_PROFILE.aboutDesc,
        aboutFeatures: featuresJson,
        aboutFeature1: featuresArray[0] || '',
        aboutFeature2: featuresArray[1] || '',
        aboutFeature3: featuresArray[2] || '',
        aboutImage1Url: aboutImage1Url ? String(aboutImage1Url).trim() : DEFAULT_PROFILE.aboutImage1Url,
        aboutImage2Url: aboutImage2Url ? String(aboutImage2Url).trim() : DEFAULT_PROFILE.aboutImage2Url,
        rulesImageUrl: rulesImageUrl ? String(rulesImageUrl).trim() : DEFAULT_PROFILE.rulesImageUrl,
      },
      create: {
        id: 1,
        siteName: siteName !== undefined ? String(siteName).trim() : DEFAULT_PROFILE.siteName,
        slogan: slogan !== undefined ? String(slogan).trim() : DEFAULT_PROFILE.slogan,
        description: description !== undefined ? String(description).trim() : DEFAULT_PROFILE.description,
        logoUrl: logoUrl ? String(logoUrl).trim() : DEFAULT_PROFILE.logoUrl,
        heroImageUrl: heroImageUrl ? String(heroImageUrl).trim() : DEFAULT_PROFILE.heroImageUrl,
        aboutTitle: aboutTitle !== undefined ? String(aboutTitle).trim() : DEFAULT_PROFILE.aboutTitle,
        aboutDesc: aboutDesc !== undefined ? String(aboutDesc).trim() : DEFAULT_PROFILE.aboutDesc,
        aboutFeatures: featuresJson,
        aboutFeature1: featuresArray[0] || '',
        aboutFeature2: featuresArray[1] || '',
        aboutFeature3: featuresArray[2] || '',
        aboutImage1Url: aboutImage1Url ? String(aboutImage1Url).trim() : DEFAULT_PROFILE.aboutImage1Url,
        aboutImage2Url: aboutImage2Url ? String(aboutImage2Url).trim() : DEFAULT_PROFILE.aboutImage2Url,
        rulesImageUrl: rulesImageUrl ? String(rulesImageUrl).trim() : DEFAULT_PROFILE.rulesImageUrl,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        siteName: updated.siteName || DEFAULT_PROFILE.siteName,
        slogan: updated.slogan || DEFAULT_PROFILE.slogan,
        description: updated.description || DEFAULT_PROFILE.description,
        logoUrl: updated.logoUrl || DEFAULT_PROFILE.logoUrl,
        heroImageUrl: updated.heroImageUrl || DEFAULT_PROFILE.heroImageUrl,
        aboutTitle: updated.aboutTitle || DEFAULT_PROFILE.aboutTitle,
        aboutDesc: updated.aboutDesc || DEFAULT_PROFILE.aboutDesc,
        aboutFeatures: featuresArray,
        aboutFeature1: featuresArray[0] || '',
        aboutFeature2: featuresArray[1] || '',
        aboutFeature3: featuresArray[2] || '',
        aboutImage1Url: updated.aboutImage1Url || DEFAULT_PROFILE.aboutImage1Url,
        aboutImage2Url: updated.aboutImage2Url || DEFAULT_PROFILE.aboutImage2Url,
        rulesImageUrl: updated.rulesImageUrl || DEFAULT_PROFILE.rulesImageUrl,
      },
    });
  } catch (error) {
    console.error('Update profile settings error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูลโปรไฟล์และรูปภาพ' },
      { status: 500 }
    );
  }
}
