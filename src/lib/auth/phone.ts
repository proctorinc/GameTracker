import { parsePhoneNumber } from "libphonenumber-js";

export interface PhoneError {
  message: string;
  isValid: false;
}

export type PhoneValidationResult = string | PhoneError;

function coerceFrontendPhoneInput(input: string): string {
  const trimmed = input.trim();

  // The login form sends digits only, e.g. "15550009999".
  if (/^\d+$/.test(trimmed)) {
    if (trimmed.length === 11 && trimmed.startsWith("1")) {
      return `+${trimmed}`;
    }

    if (trimmed.length === 10) {
      return `+1${trimmed}`;
    }
  }

  return trimmed;
}

/**
 * Parse and normalize a phone number to E.164 format.
 */
export function normalizePhoneToE164(input: string): PhoneValidationResult {
  const trimmed = coerceFrontendPhoneInput(input);

  // Reject empty strings explicitly
  if (!trimmed) {
    return { message: "Phone number is required", isValid: false };
  }

  // Check for valid characters only
  if (!/^[+\d\s\-\(\)\.\-]+$/.test(trimmed)) {
    return { message: "Phone number contains invalid characters", isValid: false };
  }

  try {
    const parsed = parsePhoneNumber(trimmed, undefined);

    if (!parsed.isValid) {
      return {
        message: `Invalid phone number: ${trimmed}`,
        isValid: false,
      };
    }

    return parsed.format("E.164");
  } catch {
    return { message: "Unable to parse phone number", isValid: false };
  }
}

/**
 * Parse a phone number using libphonenumber-js with region guessing.
 */
export function parsePhoneForInternalUse(input: string): PhoneValidationResult {
  const normalizedInput = coerceFrontendPhoneInput(input);

  // Reject empty strings explicitly
  if (!normalizedInput.trim()) {
    return { message: "Phone number is required", isValid: false };
  }

  try {
    const parsed = parsePhoneNumber(normalizedInput, undefined);

    if (!parsed.isValid) {
      // Allow numbers with country code only
      if (/^\+\d+$/.test(parsed.format("E.164"))) {
        return parsed.format("E.164");
      }
      return { message: "Invalid phone number", isValid: false };
    }

    return parsed.format("E.164");
  } catch {
    return { message: "Unable to parse phone number", isValid: false };
  }
}
