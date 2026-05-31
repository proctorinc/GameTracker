export type LogValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Record<string, unknown>
  | Array<unknown>;

export type LogMeta = Record<string, LogValue>;

function writeLog(level: "info" | "warn" | "error", event: string, payload: LogMeta) {
  const entry = JSON.stringify({
    level,
    event,
    ...payload,
  });

  if (level === "info") {
    console.info(entry);
    return;
  }

  if (level === "warn") {
    console.warn(entry);
    return;
  }

  console.error(entry);
}

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    message: typeof error === "string" ? error : "Unknown error",
  };
}

export function logInfo(event: string, meta: LogMeta = {}) {
  writeLog("info", event, meta);
}

export function logWarn(event: string, meta: LogMeta = {}) {
  writeLog("warn", event, meta);
}

export function logError(event: string, error: unknown, meta: LogMeta = {}) {
  writeLog("error", event, {
    ...meta,
    error: normalizeError(error),
  });
}

export function redactPhoneNumber(phoneNumber?: string | null) {
  if (!phoneNumber) {
    return null;
  }

  const digits = phoneNumber.replace(/\D/g, "");
  if (digits.length <= 4) {
    return `***${digits}`;
  }

  return `***${digits.slice(-4)}`;
}

export function redactToken(token?: string | null) {
  if (!token) {
    return null;
  }

  if (token.length <= 6) {
    return `***${token}`;
  }

  return `${token.slice(0, 3)}***${token.slice(-3)}`;
}

export function describeDatabaseTarget(databaseUrl: string) {
  if (databaseUrl.startsWith("file:")) {
    return "local-sqlite";
  }

  if (databaseUrl.startsWith("libsql://") || databaseUrl.startsWith("https://")) {
    try {
      return new URL(databaseUrl).host;
    } catch {
      return "remote-libsql";
    }
  }

  return "unknown";
}
