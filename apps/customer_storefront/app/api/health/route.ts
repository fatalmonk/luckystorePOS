export const dynamic = 'force-dynamic';
export const revalidate = 0;

function resolveBuildSha() {
  const candidates = [
    process.env.NEXT_PUBLIC_BUILD_SHA,
    process.env.BUILD_SHA,
    process.env.GITHUB_SHA,
    process.env.VERCEL_GIT_COMMIT_SHA,
  ];
  for (const value of candidates) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

export async function GET() {
  return Response.json({
    status: 'ok',
    service: 'customer-storefront',
    buildSha: resolveBuildSha(),
    timestamp: new Date().toISOString(),
  });
}
