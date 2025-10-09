/* @jsxRuntime automatic @jsxImportSource react */
import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const creatorName = searchParams.get('creator') || 'Someone';
    const targetName = searchParams.get('target') || 'Someone Amazing';
    const type = searchParams.get('type') || 'chain';
    const isTest = searchParams.get('test') === '1' || searchParams.get('debug') === '1';

    const size = { width: 1200, height: 630 } as const;

    // Simple test image to verify runtime rendering
    if (isTest) {
      return new ImageResponse(
        (
          <div style={{
            height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#0ea5e9', color: '#fff', fontSize: 64, fontWeight: 800,
            fontFamily: 'ui-sans-serif, system-ui, Segoe UI, Roboto, Arial'
          }}>OG OK</div>
        ),
        size
      );
    }

    if (type === 'connector') {
      return new ImageResponse(
        (
          <div style={{
            height: '100%', width: '100%', display: 'flex', flexDirection: 'column',
            alignItems: 'flex-start', justifyContent: 'center', padding: 80, position: 'relative',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            fontFamily: 'Inter, ui-sans-serif, system-ui, Segoe UI, Roboto, Arial'
          }}>
            <div style={{ position: 'absolute', left: 150, top: 150, width: 240, height: 240, borderRadius: '50%', background: 'rgba(59,130,246,.1)' }} />
            <div style={{ position: 'absolute', right: 150, bottom: 80, width: 300, height: 300, borderRadius: '50%', background: 'rgba(59,130,246,.1)' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ fontSize: 72, fontWeight: 800, color: '#fff' }}>6Degree</div>
              <div style={{ fontSize: 56, fontWeight: 800, color: '#3b82f6' }}>Connector Game</div>
              <div style={{ fontSize: 48, color: '#fff', marginTop: 20 }}>Help connect to:</div>
              <div style={{ fontSize: 56, fontWeight: 800, color: '#10b981' }}>{targetName}</div>
              <div style={{ fontSize: 36, color: 'rgba(255,255,255,.9)', marginTop: 20 }}>Play the networking path game!</div>
            </div>
          </div>
        ),
        size
      );
    }

    return new ImageResponse(
      (
        <div style={{
          height: '100%', width: '100%', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', background: '#0f172a',
          fontFamily: 'Inter, ui-sans-serif, system-ui, Segoe UI, Roboto, Arial'
        }}>
          <div style={{
            width: 100, height: 100, borderRadius: 9999,
            background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 40, fontWeight: 800, color: '#fff', marginBottom: 40
          }}>6D</div>

          <div style={{ fontSize: 64, fontWeight: 800, color: '#fff', marginBottom: 20 }}>6Degree</div>

          <div style={{ fontSize: 42, color: 'rgba(255,255,255,.95)', textAlign: 'center', marginBottom: 10 }}>
            {creatorName} → {targetName}
          </div>

          <div style={{ fontSize: 36, fontWeight: 700, color: 'rgba(255,255,255,.85)', textAlign: 'center' }}>
            Join Chain and Earn Rewards
          </div>
        </div>
      ),
      size
    );
  } catch (e: any) {
    return new Response('Failed to generate image', { status: 500 });
  }
}


