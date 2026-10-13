import { catalogImageData } from './image.ts'
import { assertImageDimensions } from './dimensions.ts'

function webp(width = 300, height = 200) {
  const bytes = new Uint8Array(26)
  bytes.set(new TextEncoder().encode('RIFF'), 0); bytes.set(new TextEncoder().encode('WEBPVP8L'), 8)
  const view = new DataView(bytes.buffer)
  view.setUint32(4, 18, true); view.setUint32(16, 5, true); bytes[20] = 47
  view.setUint32(21, (width - 1) | (height - 1) << 14, true)
  return bytes
}

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
    return Promise.resolve(new Response(webp(), { headers: { 'content-type': 'image/webp' } }))
  })
  if (!result.dataUrl.startsWith('data:image/webp;base64,') || result.mimeType !== 'image/webp') throw new Error('DATA_URL_MISMATCH')
})

Deno.test('dimensions cap decoded pixels and reject malformed or mismatched image headers', () => {
  for (const [bytes, mime] of [[webp(3000, 3000), 'image/webp'], [webp(5000, 1), 'image/webp'],
    [webp(), 'image/png'], [new Uint8Array([1,2,3]), 'image/webp']] as const) {
    let rejected = false
    try { assertImageDimensions(bytes, mime) } catch { rejected = true }
    if (!rejected) throw new Error('UNSAFE_DIMENSIONS_ACCEPTED')
  }
  const png = new Uint8Array(45); png.set([137,80,78,71,13,10,26,10]); png.set(new TextEncoder().encode('IHDR'), 12)
  png.set(new TextEncoder().encode('IEND'), 37)
  const view = new DataView(png.buffer); view.setUint32(8, 13); view.setUint32(16, 400); view.setUint32(20, 200)
  const completeJpeg = new Uint8Array([255,216,255,192,0,8,8,0,200,1,144,1,255,217])
  const truncatedJpeg = new Uint8Array([255,216,255,192,0,8,8,0,200,1,144,1])
  let truncatedRejected = false
  try { assertImageDimensions(truncatedJpeg, 'image/jpeg') } catch { truncatedRejected = true }
  if (!truncatedRejected) throw new Error('UNSAFE_DIMENSIONS_ACCEPTED')
  for (const [bytes, mime] of [[png, 'image/png'], [completeJpeg, 'image/jpeg'], [webp(400,200), 'image/webp']] as const) {
    const result = assertImageDimensions(bytes, mime)
    if (result.width !== 400 || result.height !== 200) throw new Error('DIMENSION_MISMATCH')
  }
})

Deno.test('PNG animation, repeated headers, incomplete chunks and missing IEND are denied', () => {
  const png = new Uint8Array(45); png.set([137,80,78,71,13,10,26,10]); png.set(new TextEncoder().encode('IHDR'), 12)
  const view = new DataView(png.buffer); view.setUint32(8, 13); view.setUint32(16, 400); view.setUint32(20, 200)
  png.set(new TextEncoder().encode('IEND'), 37)
  const animation = new Uint8Array(65); animation.set(png.subarray(0,33)); animation.set(png.subarray(33),53)
  new DataView(animation.buffer).setUint32(33,8); animation.set(new TextEncoder().encode('acTL'),37)
  const repeated = png.slice(); repeated.set(new TextEncoder().encode('IHDR'),37)
  for (const bytes of [animation, repeated, png.subarray(0,40), png.subarray(0,33)]) {
    let rejected = false
    try { assertImageDimensions(bytes,'image/png') } catch { rejected = true }
    if (!rejected) throw new Error('UNSAFE_PNG_ACCEPTED')
  }
})

Deno.test('oversized decoded image is denied before a data URL is returned', async () => {
  let rejected = false
  try { await catalogImageData('https://images.luckystore1947.com/products/a.webp',
    () => Promise.resolve(new Response(webp(3000, 3000), { headers: { 'content-type': 'image/webp' } }))) }
  catch { rejected = true }
  if (!rejected) throw new Error('UNSAFE_IMAGE_ACCEPTED')
})

Deno.test('WebP lossy and extended dimensions are checked, animation and canvas mismatch denied', () => {
  const lossy = new Uint8Array(30)
  lossy.set(new TextEncoder().encode('RIFF'), 0); lossy.set(new TextEncoder().encode('WEBPVP8 '), 8)
  const view = new DataView(lossy.buffer)
  view.setUint32(4, 22, true); view.setUint32(16, 10, true)
  lossy.set([157,1,42], 23); view.setUint16(26, 400, true); view.setUint16(28, 200, true)
  const extended = new Uint8Array(48)
  extended.set(lossy.subarray(0, 12)); extended.set(new TextEncoder().encode('VP8X'), 12)
  new DataView(extended.buffer).setUint32(4, 40, true)
  new DataView(extended.buffer).setUint32(16, 10, true)
  extended[24] = 143; extended[25] = 1; extended[27] = 199
  extended.set(lossy.subarray(12), 30)
  for (const bytes of [lossy, extended]) {
    const result = assertImageDimensions(bytes, 'image/webp')
    if (result.width !== 400 || result.height !== 200) throw new Error('DIMENSION_MISMATCH')
  }
  for (const change of [(bytes: Uint8Array) => { bytes[20] = 2 },
    (bytes: Uint8Array) => { bytes[24] = 1 }]) {
    const malformed = extended.slice(); change(malformed)
    let rejected = false
    try { assertImageDimensions(malformed, 'image/webp') } catch { rejected = true }
    if (!rejected) throw new Error('UNSAFE_WEBP_ACCEPTED')
  }
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
