
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const RESEND_API_KEY = process.env.RESEND_API_KEY;

async function testResend() {
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY is missing');
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'onboarding@resend.dev',
      to: 'jp@outskill.com', // Assuming this is the owner's email for testing
      subject: 'Test Email',
      html: '<p>Test</p>'
    })
  });

  const data = await res.json();
  console.log('Resend Response:', data);
}

testResend();
