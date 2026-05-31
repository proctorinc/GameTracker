"use client";

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";

type PhoneNumberInputProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  id?: string;
  required?: boolean;
  "data-testid"?: string;
};

export function PhoneNumberInput({
  value,
  onChange,
  disabled = false,
  autoFocus = false,
  id,
  required = false,
  "data-testid": dataTestId,
}: PhoneNumberInputProps) {
  return (
    <InputOTP
      id={id}
      type="tel"
      autoComplete="tel"
      autoFocus={autoFocus}
      maxLength={10}
      value={value}
      className="w-full"
      containerClassName="w-full"
      data-testid={dataTestId}
      onChange={onChange}
      disabled={disabled}
      required={required}
    >
      <InputOTPGroup className="grid w-full grid-cols-[repeat(3,minmax(0,1fr))_auto_repeat(3,minmax(0,1fr))_auto_repeat(4,minmax(0,1fr))] *:data-[slot=input-otp-slot]:h-12 *:data-[slot=input-otp-slot]:w-full *:data-[slot=input-otp-slot]:text-xl *:data-[slot=input-otp-slot]:border">
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
        <InputOTPSlot index={2} />
        <InputOTPSeparator />
        <InputOTPSlot index={3} />
        <InputOTPSlot index={4} />
        <InputOTPSlot index={5} />
        <InputOTPSeparator />
        <InputOTPSlot index={6} />
        <InputOTPSlot index={7} />
        <InputOTPSlot index={8} />
        <InputOTPSlot index={9} />
      </InputOTPGroup>
    </InputOTP>
  );
}
