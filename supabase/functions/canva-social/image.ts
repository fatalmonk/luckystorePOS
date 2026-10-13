export async function catalogImageData(imageUrl: string, fetcher: typeof fetch = fetch) {
  const source = new URL(imageUrl)
  if (source.protocol !== 'https:' || source.hostname !== 'images.luckystore1947.com' ||
    source.username || source.password || source.port || !source.pathname.startsWith('/products/') ||
    /%|\.\./.test(source.pathname)) throw new Error('IMAGE_SOURCE_DENIED')
  const response = await fetcher(source, { redirect: 'error', signal: AbortSignal.timeout(10000) })
  const mimeType = response.headers.get('content-type')?.split(';')[0].trim()
  if (!response.ok || !['image/jpeg', 'image/png', 'image/webp'].includes(mimeType ?? '')) {
    throw new Error('IMAGE_UNAVAILABLE')
  }
  const reader = response.body?.getReader()
  if (!reader) throw new Error('IMAGE_UNAVAILABLE')
  const chunks: Uint8Array[] = []
  let length = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    length += value.length
    if (length > 4_500_000) { await reader.cancel(); throw new Error('IMAGE_TOO_LARGE') }
    chunks.push(value)
  }
  if (!length) throw new Error('IMAGE_UNAVAILABLE')
  let binary = ''
  for (const chunk of chunks) for (let i = 0; i < chunk.length; i += 8192) {
    binary += String.fromCharCode(...chunk.subarray(i, i + 8192))
  }
  return { dataUrl: `data:${mimeType};base64,${btoa(binary)}`, mimeType }
}
