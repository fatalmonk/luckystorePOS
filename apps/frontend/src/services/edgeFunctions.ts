import { supabase } from './supabase'
import { getEdgeFunctionErrorMessage } from './supabaseErrors'

function isInvalidJwtError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof (error as { message?: unknown })?.message === 'string'
        ? (error as { message: string }).message
        : ''

  if (message.toLowerCase().includes('invalid jwt')) return true

  const maybeContext = error as { context?: unknown }
  const response = maybeContext?.context instanceof Response ? maybeContext.context : undefined
  return response?.status === 401
}

export async function invokeEdgeFunction<TResponse = unknown>(
  functionName: string,
  body: unknown,
  fallbackErrorMessage: string,
): Promise<TResponse> {
  const firstTry = await supabase.functions.invoke<TResponse>(functionName, { body: body as never })
  if (!firstTry.error) {
    if (firstTry.data == null) {
      throw new Error(`${fallbackErrorMessage}: empty response`)
    }
    return firstTry.data
  }

  if (isInvalidJwtError(firstTry.error)) {
    const { data, error: refreshError } = await supabase.auth.refreshSession()
    if (!refreshError && data.session?.access_token) {
      const secondTry = await supabase.functions.invoke<TResponse>(functionName, {
        body: body as never,
        headers: {
          Authorization: `Bearer ${data.session.access_token}`,
        },
      })
      if (!secondTry.error) {
        if (secondTry.data == null) {
          throw new Error(`${fallbackErrorMessage}: empty response`)
        }
        return secondTry.data
      }
      const secondMessage = await getEdgeFunctionErrorMessage(secondTry.error, fallbackErrorMessage)
      throw new Error(secondMessage)
    }
    throw new Error('Session expired. Please log in again.')
  }

  const firstMessage = await getEdgeFunctionErrorMessage(firstTry.error, fallbackErrorMessage)
  throw new Error(firstMessage)
}
