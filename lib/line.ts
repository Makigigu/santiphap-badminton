// src/lib/line.ts
import * as line from '@line/bot-sdk';

const client = new line.Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
});

const ADMIN_USER_ID = process.env.LINE_ADMIN_USER_ID || '';

export const sendLineNotification = async (message: string, flexContents?: any) => {
  if (!ADMIN_USER_ID) {
    console.error("❌ LINE_ADMIN_USER_ID ไม่ถูกต้อง");
    return;
  }

  try {
    if (flexContents) {
      // ส่งแบบการ์ดสวยๆ (Flex Message)
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