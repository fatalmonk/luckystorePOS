// Inspect container headers before the browser allocates a decoded pixel buffer.
// Fail closed for unknown containers and animation; thumbnails only need still images.
export function assertImageDimensions(bytes: Uint8Array, mime: string) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const ascii = (offset: number, length: number) => String.fromCharCode(...bytes.subarray(offset, offset + length))
  const fail = () => { throw new Error('IMAGE_DIMENSIONS_INVALID') }
  let width = 0, height = 0
  if (mime === 'image/png') {
    if (bytes.length < 33 || ![137,80,78,71,13,10,26,10].every((v, i) => bytes[i] === v) ||
      view.getUint32(8) !== 13 || ascii(12, 4) !== 'IHDR') fail()
    width = view.getUint32(16); height = view.getUint32(20)
    let offset = 8, ended = false
    while (offset + 12 <= bytes.length) {
      const length = view.getUint32(offset), type = ascii(offset + 4, 4)
      if (offset + 12 + length > bytes.length || !/^[A-Za-z]{4}$/.test(type) ||
        ['acTL', 'fcTL', 'fdAT'].includes(type) || (type === 'IHDR' && offset !== 8)) fail()
      offset += 12 + length
      if (type === 'IEND') {
        if (length !== 0 || offset !== bytes.length) fail()
        ended = true; break
      }
    }
    if (!ended) fail()
  } else if (mime === 'image/jpeg') {
    if (bytes.length < 4 || bytes[0] !== 255 || bytes[1] !== 216) fail()
    let offset = 2
    while (offset < bytes.length) {
      if (bytes[offset++] !== 255) fail()
      while (bytes[offset] === 255) offset++
      const marker = bytes[offset++]
      if (marker === 217 || marker === 218) break
      if (marker === 1 || (marker >= 208 && marker <= 215)) continue
      if (offset + 2 > bytes.length) fail()
      const size = view.getUint16(offset)
      if (size < 2 || offset + size > bytes.length) fail()
      if ([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)) {
        if (size < 8) fail()
        height = view.getUint16(offset + 3); width = view.getUint16(offset + 5)
        break
      }
      offset += size
    }
  } else if (mime === 'image/webp') {
    if (bytes.length < 20 || ascii(0, 4) !== 'RIFF' || ascii(8, 4) !== 'WEBP' ||
      view.getUint32(4, true) + 8 !== bytes.length) fail()
    const uint24 = (o: number) => bytes[o] | bytes[o + 1] << 8 | bytes[o + 2] << 16
    let offset = 12
    let canvas: { width: number; height: number } | undefined
    let frame: { width: number; height: number } | undefined
    while (offset + 8 <= bytes.length) {
      const type = ascii(offset, 4), length = view.getUint32(offset + 4, true), start = offset + 8
      if (start + length > bytes.length) fail()
      if (type === 'ANIM' || type === 'ANMF') fail()
      if (type === 'VP8X') {
        if (length !== 10 || canvas || (bytes[start] & 2)) fail()
        canvas = { width: uint24(start + 4) + 1, height: uint24(start + 7) + 1 }
      } else if (type === 'VP8 ') {
        if (length < 10 || frame || (bytes[start] & 1) || bytes[start + 3] !== 157 ||
          bytes[start + 4] !== 1 || bytes[start + 5] !== 42) fail()
        frame = { width: view.getUint16(start + 6, true) & 16383, height: view.getUint16(start + 8, true) & 16383 }
      } else if (type === 'VP8L') {
        if (length < 5 || frame || bytes[start] !== 47 || (bytes[start + 4] >> 5)) fail()
        const bits = view.getUint32(start + 1, true)
        frame = { width: (bits & 16383) + 1, height: ((bits >>> 14) & 16383) + 1 }
      }
      offset = start + length + (length & 1)
    }
    if (offset !== bytes.length || !frame || (canvas &&
      (canvas.width !== frame.width || canvas.height !== frame.height))) fail()
    width = frame!.width; height = frame!.height
  } else fail()
  if (!width || !height) fail()
  if (width > 4096 || height > 4096 || width * height > 4_000_000) throw new Error('IMAGE_PIXELS_TOO_LARGE')
  return { width, height }
}
