import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@absqir/ui/input-otp";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { CODE_LENGTH } from "@/lib/auth-schemas";

export interface CodeInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/** Six digit boxes. The browser can fill them from an SMS or a mail app. */
export function CodeInput(props: CodeInputProps) {
  return (
    <InputOTP
      id="code"
      maxLength={CODE_LENGTH}
      pattern={REGEXP_ONLY_DIGITS}
      value={props.value}
      onChange={props.onChange}
      disabled={props.disabled}
      autoComplete="one-time-code"
      inputMode="numeric"
      autoFocus
    >
      <InputOTPGroup>
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
        <InputOTPSlot index={2} />
      </InputOTPGroup>
      <InputOTPSeparator />
      <InputOTPGroup>
        <InputOTPSlot index={3} />
        <InputOTPSlot index={4} />
        <InputOTPSlot index={5} />
      </InputOTPGroup>
    </InputOTP>
  );
}
