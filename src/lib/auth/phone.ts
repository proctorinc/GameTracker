import { parsePhoneNumber } from "libphonenumber-js";

export interface PhoneError {
  message: string;
  isValid: false;
}

export type PhoneValidationResult = string | PhoneError;

/**
 * Parse and normalize a phone number to E.164 format.
 */
export function normalizePhoneToE164(input: string): PhoneValidationResult {
  const trimmed = input.trim();

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
  // Reject empty strings explicitly
  if (!input.trim()) {
    return { message: "Phone number is required", isValid: false };
  }

  try {
    const parsed = parsePhoneNumber(input, undefined);

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
