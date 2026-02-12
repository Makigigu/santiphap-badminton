// src/lib/line.ts
import * as line from '@line/bot-sdk';

// ดึงค่า ID ของแอดมินมาเก็บไว้
const ADMIN_USER_ID = process.env.LINE_ADMIN_USER_ID || '';

export const sendLineNotification = async (message: string, flexContents?: any) => {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  // เช็คก่อน: ถ้าไม่มี Token (เช่นตอน Build บน Server) ให้จบการทำงานเลย ไม่ต้อง Error
  if (!token) {
    console.error("⚠️ ไม่พบ LINE_CHANNEL_ACCESS_TOKEN - ข้ามการส่งแจ้งเตือน");
    return;
  }

  if (!ADMIN_USER_ID) {
    console.error("⚠️ ไม่พบ LINE_ADMIN_USER_ID");
    return;
  }

  // ย้ายการสร้าง Client มาไว้ในฟังก์ชัน (Lazy Init)
  // บรรทัดนี้จะไม่ทำงานตอน Build ทำให้ไม่เกิด Error ครับ
  const client = new line.Client({
    channelAccessToken: token,
  });

  try {
    if (flexContents) {
      // ส่งแบบ Flex Message
      await client.pushMessage(ADMIN_USER_ID, {
        type: 'flex',
        altText: message,
        contents: flexContents
      });
    } else {
      // ส่งแบบข้อความธรรมดา
      await client.pushMessage(ADMIN_USER_ID, {
        type: 'text',
        text: message,
      });
    }
    console.log("✅ ส่งแจ้งเตือน LINE สำเร็จ");
  } catch (error) {
    console.error("❌ ส่งแจ้งเตือน LINE ไม่สำเร็จ:", error);
  }
};