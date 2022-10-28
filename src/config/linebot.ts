import { Client, ClientConfig } from '@line/bot-sdk';
import dotenv from 'dotenv';
import path from 'path';

// Load env file
dotenv.config({ path: path.join(__dirname, '../.env') });

const linebotConfig: ClientConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

console.log('channelSecret' + (linebotConfig.channelSecret || '').substring(5) + '...');

export const LineBot = new Client(linebotConfig);
