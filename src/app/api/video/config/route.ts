import { getVideoProvider } from '@/lib/providers';

export const runtime = 'nodejs';

export async function GET() {
  // Explicitly return public fields only. Never serialize environment variables.
  const { configured, capabilities, message } = getVideoProvider().getStatus();
  return Response.json({ configured, capabilities, message }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
