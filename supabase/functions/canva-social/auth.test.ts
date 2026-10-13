import { errors } from 'https://esm.sh/jose@5.10.0'
import { verificationFailure, verifyCanvaToken } from './auth.ts'

Deno.test('missing Canva app configuration is 500 even for malformed bearer', async () => {
  try { await verifyCanvaToken('bad', undefined); throw new Error('EXPECTED_FAILURE') }
  catch (error) { if (verificationFailure(error).status !== 500) throw error }
})

Deno.test('malformed, expired, incorrect audience and signature tokens remain 401', async () => {
  for (const error of [new errors.JWTInvalid('bad'), new errors.JWTExpired('expired', {}, 'exp', 'check_failed'),
    new errors.JWTClaimValidationFailed('audience', {}, 'aud', 'check_failed'),
    new errors.JWSSignatureVerificationFailed(), new errors.JWKSNoMatchingKey()]) {
    if (verificationFailure(error).status !== 401) throw new Error('WRONG_TOKEN_STATUS')
  }
  try { await verifyCanvaToken('not.a.jwt', 'app'); throw new Error('EXPECTED_FAILURE') }
  catch (error) { if (verificationFailure(error).status !== 401) throw error }
})

Deno.test('JWKS outages, timeouts, malformed keysets and unexpected verifier failures are 503', () => {
  for (const error of [new TypeError('secret network detail'), new errors.JWKSTimeout(),
    new errors.JWKSInvalid('bad'), new Error('unexpected'), new errors.JWKInvalid('bad')]) {
    const failure = verificationFailure(error)
    if (failure.status !== 503 || failure.message.includes('secret')) throw new Error('WRONG_SERVICE_STATUS')
  }
})
