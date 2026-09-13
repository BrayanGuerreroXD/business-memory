import type { ErrorPayload } from './error'

export function okEnvelope(data: unknown): string {
  return `${JSON.stringify({ ok: true, data })}\n`
}

export function errEnvelope(payload: ErrorPayload): string {
  return `${JSON.stringify({ ok: false, error: payload })}\n`
}
