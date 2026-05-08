import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'frontend/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, SERVICE_ROLE_KEY);

async function testPhoneLink() {
    console.log('Testing generateLink for phone...');
    const { data, error } = await supabase.auth.admin.generateLink({
        type: 'signup',
        // @ts-ignore
        phone: '+919876543210'
    });

    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log('Success! Data:', data);
    }
}

testPhoneLink();
