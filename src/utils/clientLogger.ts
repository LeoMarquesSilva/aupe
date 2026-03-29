/**
 * Logs no browser: verbose apenas em desenvolvimento ou com REACT_APP_DEBUG_CLIENT_LOGS=true.
 * Em produção, evitar despejar objetos completos (respostas API podem conter tokens ou PII).
 */

export function isClientVerboseLogging(): boolean {
  return (
    process.env.NODE_ENV === "development" || process.env.REACT_APP_DEBUG_CLIENT_LOGS === "true"
  );
}

export function devLog(...args: unknown[]): void {
  if (isClientVerboseLogging()) console.log(...args);
}

export function devInfo(...args: unknown[]): void {
  if (isClientVerboseLogging()) console.info(...args);
}

export function devWarn(...args: unknown[]): void {
  if (isClientVerboseLogging()) console.warn(...args);
}

export function redactOAuthLikeStringSnippet(raw: string, maxLen = 280): string {
  let s = raw.slice(0, maxLen);
  s = s.replace(/"access_token"\s*:\s*"[^"]*"/gi, '"access_token":"[REDACTED]"');
  s = s.replace(/"refresh_token"\s*:\s*"[^"]*"/gi, '"refresh_token":"[REDACTED]"');
  s = s.replace(/"client_secret"\s*:\s*"[^"]*"/gi, '"client_secret":"[REDACTED]"');
  return s;
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  return "";
}

export function logClientError(context: string, err?: unknown): void {
  if (isClientVerboseLogging()) {
    console.error(context, err);
    return;
  }
  const message = errorMessage(err);
  if (message) console.error(`${context}: ${message}`);
  else console.error(context);
}
