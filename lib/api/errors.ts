export interface ApiErrorShape { error: { code: string; message: string } }
export function apiError(code: string, message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: { code, message } } satisfies ApiErrorShape), { status, headers: { 'content-type': 'application/json' } });
}
