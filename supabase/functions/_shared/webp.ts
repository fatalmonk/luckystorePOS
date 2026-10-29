export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_WEBP_DIMENSION = 4096;
export const MAX_WEBP_PIXELS = 4_000_000;

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", copy.buffer));
  return [...digest].map((value) => value.toString(16).padStart(2, "0")).join("");
}

export function isWebp(bytes: Uint8Array): boolean {
  return bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
}

export type WebpDimensions = {
  width: number;
  height: number;
};

/**
 * Validates WebP container format, ensuring:
 * - Proper RIFF / WEBP structure
 * - No animation (ANIM/ANMF chunks or VP8X animation flag)
 * - Dimensions within 4096 per axis and <= 4,000,000 total pixels
 */
export function validateWebpStructure(bytes: Uint8Array): { valid: true; width: number; height: number } | { valid: false; error: string } {
  if (bytes.length < 12) {
    return { valid: false, error: "Uploaded object is too small to be a WebP image" };
  }
  const riff = String.fromCharCode(...bytes.slice(0, 4));
  const webp = String.fromCharCode(...bytes.slice(8, 12));
  if (riff !== "RIFF" || webp !== "WEBP") {
    return { valid: false, error: "Uploaded object is not a valid WebP payload" };
  }

  const fileSize = (bytes[4] | (bytes[5] << 8) | (bytes[6] << 16) | (bytes[7] << 24)) >>> 0;
  // RIFF length is total size minus 8 bytes (RIFF header)
  if (bytes.length < fileSize + 8) {
    return { valid: false, error: "WebP payload is truncated" };
  }

  let offset = 12;
  let parsedDimensions: WebpDimensions | null = null;

  while (offset + 8 <= bytes.length) {
    const chunkFourCC = String.fromCharCode(...bytes.slice(offset, offset + 4));
    const chunkLength = (bytes[offset + 4] | (bytes[offset + 5] << 8) | (bytes[offset + 6] << 16) | (bytes[offset + 7] << 24)) >>> 0;
    const chunkDataOffset = offset + 8;
    if (chunkDataOffset + chunkLength > bytes.length) {
      return { valid: false, error: "WebP chunk exceeds payload bounds" };
    }

    if (chunkFourCC === "ANIM" || chunkFourCC === "ANMF") {
      return { valid: false, error: "Animated WebP images are not supported" };
    }

    if (chunkFourCC === "VP8X") {
      if (chunkLength < 10) {
        return { valid: false, error: "Malformed VP8X WebP header" };
      }
      const flags = bytes[chunkDataOffset];
      const isAnimated = (flags & 0x02) !== 0;
      if (isAnimated) {
        return { valid: false, error: "Animated WebP images are not supported" };
      }
      const widthMinus1 = bytes[chunkDataOffset + 4] | (bytes[chunkDataOffset + 5] << 8) | (bytes[chunkDataOffset + 6] << 16);
      const heightMinus1 = bytes[chunkDataOffset + 7] | (bytes[chunkDataOffset + 8] << 8) | (bytes[chunkDataOffset + 9] << 16);
      parsedDimensions = {
        width: widthMinus1 + 1,
        height: heightMinus1 + 1,
      };
    } else if (chunkFourCC === "VP8 " && !parsedDimensions) {
      if (chunkLength < 10) {
        return { valid: false, error: "Malformed VP8 WebP header" };
      }
      // Frame tag 3 bytes, start code 3 bytes (0x9d 0x01 0x2a)
      const startCode = [bytes[chunkDataOffset + 3], bytes[chunkDataOffset + 4], bytes[chunkDataOffset + 5]];
      if (startCode[0] !== 0x9d || startCode[1] !== 0x01 || startCode[2] !== 0x2a) {
        return { valid: false, error: "Malformed VP8 lossy start code" };
      }
      const w = ((bytes[chunkDataOffset + 6] | (bytes[chunkDataOffset + 7] << 8)) & 0x3fff);
      const h = ((bytes[chunkDataOffset + 8] | (bytes[chunkDataOffset + 9] << 8)) & 0x3fff);
      parsedDimensions = { width: w, height: h };
    } else if (chunkFourCC === "VP8L" && !parsedDimensions) {
      if (chunkLength < 5) {
        return { valid: false, error: "Malformed VP8L WebP header" };
      }
      const signature = bytes[chunkDataOffset];
      if (signature !== 0x2f) {
        return { valid: false, error: "Malformed VP8L signature" };
      }
      const b1 = bytes[chunkDataOffset + 1];
      const b2 = bytes[chunkDataOffset + 2];
      const b3 = bytes[chunkDataOffset + 3];
      const b4 = bytes[chunkDataOffset + 4];
      const w = 1 + (b1 | ((b2 & 0x3f) << 8));
      const h = 1 + (((b2 >> 6) & 0x03) | (b3 << 2) | ((b4 & 0x0f) << 10));
      parsedDimensions = { width: w, height: h };
    }

    // Chunks are padded to even number of bytes
    const paddedLength = chunkLength + (chunkLength % 2);
    offset += 8 + paddedLength;
  }

  if (!parsedDimensions) {
    return { valid: false, error: "No valid image data chunk found in WebP" };
  }

  if (parsedDimensions.width > MAX_WEBP_DIMENSION || parsedDimensions.height > MAX_WEBP_DIMENSION) {
    return {
      valid: false,
      error: `WebP dimensions (${parsedDimensions.width}x${parsedDimensions.height}) exceed the maximum axis limit of ${MAX_WEBP_DIMENSION}px`,
    };
  }

  const pixels = parsedDimensions.width * parsedDimensions.height;
  if (pixels > MAX_WEBP_PIXELS) {
    return {
      valid: false,
      error: `WebP pixel count (${pixels}) exceeds the maximum limit of ${MAX_WEBP_PIXELS} pixels`,
    };
  }

  return { valid: true, width: parsedDimensions.width, height: parsedDimensions.height };
}
