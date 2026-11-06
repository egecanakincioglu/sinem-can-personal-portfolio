import { buildDevGlb } from '@/lib/dev-glb';

// DEVELOPMENT ONLY. Serves the synthetic "DEVELOPMENT DEMO" flange used to test the real GLTFLoader
// path. In any other environment this route answers 404 and the generator is never run.
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (process.env.NODE_ENV !== 'development' || file !== 'flange.glb') {
    return new Response('Not found', { status: 404 });
  }
  const body = buildDevGlb();
  return new Response(new Uint8Array(body), {
    headers: {
      'Content-Type': 'model/gltf-binary',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
