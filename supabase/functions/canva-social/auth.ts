import { createRemoteJWKSet, errors, jwtVerify } from 'https://esm.sh/jose@5.10.0'

export type CanvaClaims = { aud?: string; userId: string; brandId: string }

export class CanvaVerificationError extends Error {
  constructor(public readonly status: 401 | 500 | 503, message: string) { super(message) }
}

// A key-fetch/configuration failure says nothing about whether the bearer is valid.
export function verificationFailure(error: unknown): CanvaVerificationError {
  if (error instanceof CanvaVerificationError) return error
  if (error instanceof errors.JWTInvalid || error instanceof errors.JWTClaimValidationFailed ||
    error instanceof errors.JWTExpired || error instanceof errors.JWSInvalid ||
    error instanceof errors.JWSSignatureVerificationFailed || error instanceof errors.JWKSNoMatchingKey) {
    return new CanvaVerificationError(401, 'Invalid Canva bearer token')
  }
  return new CanvaVerificationError(503, 'Canva token verification is temporarily unavailable')
}

export async function verifyCanvaToken(token: string, appId: string | undefined): Promise<CanvaClaims> {
  if (!appId) throw new CanvaVerificationError(500, 'Canva authentication is not configured')
  try {
    const jwks = createRemoteJWKSet(new URL(`https://api.canva.com/rest/v1/apps/${encodeURIComponent(appId)}/jwks`))
    const { payload } = await jwtVerify(token, jwks, { audience: appId })
    if (typeof payload.userId !== 'string' || !payload.userId ||
      typeof payload.brandId !== 'string' || !payload.brandId) {
      throw new CanvaVerificationError(401, 'Invalid Canva bearer token')
    }
    return payload as CanvaClaims
  } catch (error) { throw verificationFailure(error) }
}
