import { catalogImageData } from './image.ts'

Deno.test('catalog image rejects foreign and credential-bearing URLs before fetch', async () => {
  for (const url of ['https://localhost/products/a.png', 'https://user:pass@images.luckystore1947.com/products/a.png']) {
    let called = false
    try {
      await catalogImageData(url, () => { called = true; return Promise.resolve(new Response()) })
      throw new Error('DENIAL_EXPECTED')
    } catch (e) { if (called || (e as Error).message === 'DENIAL_EXPECTED') throw e }
  }
})

Deno.test('catalog image returns bounded data URL and forbids redirects', async () => {
  const result = await catalogImageData('https://images.luckystore1947.com/products/a.webp', (_url, options) => {
    if (options?.redirect !== 'error') throw new Error('REDIRECTS_MUST_BE_DENIED')
    return Promise.resolve(new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'image/webp' } }))
  })
  if (result.dataUrl !== 'data:image/webp;base64,AQID') throw new Error('DATA_URL_MISMATCH')
})

Deno.test('catalog image rejects oversized or non-image responses', async () => {
  for (const response of [new Response('bad', { headers: { 'content-type': 'text/html' } }),
    new Response(new Uint8Array(4_500_001), { headers: { 'content-type': 'image/png' } })]) {
    let rejected = false
    try { await catalogImageData('https://images.luckystore1947.com/products/a.png', () => Promise.resolve(response)) }
    catch { rejected = true }
    if (!rejected) throw new Error('UNSAFE_IMAGE_ACCEPTED')
  }
})
