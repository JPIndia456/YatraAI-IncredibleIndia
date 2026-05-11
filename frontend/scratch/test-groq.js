
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testGroq() {
  const key = process.env.GROQ_API_KEY;
  console.log('Testing Groq Key:', key ? `${key.substring(0, 10)}...` : 'MISSING');

  if (!key) {
    console.error('Error: GROQ_API_KEY is not set in .env.local');
    process.exit(1);
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: 'Hello, are you working?' }]
      })
    });

    const data = await response.json();
    if (response.ok) {
      console.log('✅ Groq is working! Response:', data.choices[0].message.content);
    } else {
      console.error('❌ Groq Error:', data);
    }
  } catch (err) {
    console.error('❌ Fetch Error:', err.message);
  }
}

testGroq();
