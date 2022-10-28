import { Client, ClientConfig } from '@line/bot-sdk';
import dotenv from 'dotenv';
import path from 'path';

// Load env file
dotenv.config({ path: path.join(__dirname, '../.env') });

const linebotConfig: ClientConfig = {
  channelAccessToken:
    process.env.LINE_CHANNEL_ACCESS_TOKEN ||
    'r7mqQw5Ob4sVo2g2Ud5xPnORryQV140P5X6gMlLeMpU3OboLX5IMM//8WKYgKM8vVXqw3Gocr6CGOMVUputAX6BxWXlN17ySjHOrnsYAGHSHuUXeZOeLKEOsTwADMtnU2U/4+dYnfJBvZEl0Jjf4twdB04t89/1O/w1cDnyilFU=',
  channelSecret: process.env.LINE_CHANNEL_SECRET || 'f7b05245bea6a4d07aa55483f4c6f533',
};

console.log(linebotConfig);

export const LineBot = new Client(linebotConfig);
