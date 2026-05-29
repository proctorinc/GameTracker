type LogValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Record<string, unknown>
  | Array<unknown>;

type LogMeta = Record<string, LogValue>;

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
  console.info(
    JSON.stringify({
      level: "info",
      event,
      ...meta,
    }),
  );
}

export function logError(event: string, error: unknown, meta: LogMeta = {}) {
  console.error(
    JSON.stringify({
      level: "error",
      event,
      ...meta,
      error: normalizeError(error),
    }),
  );
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
