import { InputOTP, InputOTPGroup, InputOTPSlot } from "@absqir/ui/input-otp";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { CODE_LENGTH } from "@/lib/auth-schemas";

export interface CodeInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/**
 * Every slot grows, so the row ends where the submit button ends. Each digit
 * keeps its own box, and the wider gap in the middle reads the code as 3 and 3
 * without a separator glyph.
 */
const SLOT_CLASS =
  "h-12 w-auto flex-1 rounded-lg border border-input text-lg font-medium tabular-nums";

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
      containerClassName="w-full gap-4"
      autoFocus
    >
      <InputOTPGroup className="flex-1 gap-2">
        <InputOTPSlot index={0} className={SLOT_CLASS} />
        <InputOTPSlot index={1} className={SLOT_CLASS} />
        <InputOTPSlot index={2} className={SLOT_CLASS} />
      </InputOTPGroup>
      <InputOTPGroup className="flex-1 gap-2">
        <InputOTPSlot index={3} className={SLOT_CLASS} />
        <InputOTPSlot index={4} className={SLOT_CLASS} />
        <InputOTPSlot index={5} className={SLOT_CLASS} />
      </InputOTPGroup>
    </InputOTP>
  );
}
