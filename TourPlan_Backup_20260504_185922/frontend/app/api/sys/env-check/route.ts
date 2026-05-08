import { NextResponse } from 'next/server';

function isAuthorized(req: Request) {
  if (process.env.NODE_ENV !== 'production') return true;
  const secret = process.env.SYS_DEBUG_SECRET;
  if (!secret) return false;
  return req.headers.get('x-sys-debug-secret') === secret;
}

function decodeRef(jwt: string | undefined) {
  if (!jwt) return null;
  try {
    const part = jwt.split('.')[1];
    if (!part) return null;
    const payload = JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
    return typeof payload?.ref === 'string' ? payload.ref : null;
  } catch {
    return null;
  }
}

function mask(value: string | undefined) {
  if (!value) return '<unset>';
  if (value.length <= 10) return '***';
  return `${value.slice(0, 6)}...${value.slice(-6)}`;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const urlRefMatch = (url ?? '').match(/^https:\/\/([a-z0-9-]+)\.supabase\.co$/i);
  const urlRef = urlRefMatch?.[1] ?? null;
  const anonRef = decodeRef(anon);
  const serviceRef = decodeRef(service);

  return NextResponse.json({
    runtime: {
      url: url ?? '<unset>',
      urlRef,
      anonPreview: mask(anon),
      servicePreview: mask(service),
      anonLooksPlaceholder: (anon ?? '').startsWith('REPLACE_'),
      serviceLooksPlaceholder: (service ?? '').startsWith('REPLACE_'),
      anonRef,
      serviceRef,
      anonMatchesUrlRef: Boolean(urlRef && anonRef === urlRef),
      serviceMatchesUrlRef: Boolean(urlRef && serviceRef === urlRef),
    },
  });
}
