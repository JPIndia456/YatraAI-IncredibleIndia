import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  const { email, name } = await req.json()

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'TourPlan <no-reply@yatra-ai.in>',
      to: [email],
      subject: 'Welcome to TourPlan!',
      html: `
        <div style="font-family: sans-serif; padding: 20px; background: #050505; color: #fff; border-radius: 12px; border: 1px solid #FF9933;">
          <h1 style="color: #FF9933;">Namaste, ${name || 'Traveler'}!</h1>
          <p>Welcome to TourPlan, your intelligent companion for exploring the soul of India.</p>
          <p>We are excited to help you plan your next cultural odyssey.</p>
          <hr style="border: 1px solid #222; margin: 20px 0;" />
          <p style="font-size: 12px; color: #666;">This is an automated welcome email from TourPlan.</p>
        </div>
      `,
    }),
  })

  const data = await res.json()

  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
    status: res.status,
  })
})
