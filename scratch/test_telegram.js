import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'frontend/.env.local') });

const token = process.env.TELEGRAM_BOT_TOKEN;

async function checkBot() {
    if (!token) {
        console.error('TELEGRAM_BOT_TOKEN not found in .env.local');
        return;
    }

    try {
        const response = await axios.get(`https://api.telegram.org/bot${token}/getMe`);
        console.log('Bot Status:', response.data);

        const updates = await axios.get(`https://api.telegram.org/bot${token}/getUpdates`);
        console.log('Recent Updates:', JSON.stringify(updates.data, null, 2));
    } catch (error) {
        console.error('Error checking bot:', error.message);
    }
}

checkBot();
