import dotenv from 'dotenv';
import path from 'path';
import { WebClient } from '@slack/web-api';

// Load env file
dotenv.config({ path: path.join(__dirname, '../.env') });

export const SlackBot = new WebClient(process.env.SLACK_ACCESS_TOKEN);
