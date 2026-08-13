import type { ChangeEvent, ComponentProps } from "react";

import { Input } from "@/components/global/primitives/input";

type VerificationCodeInputProps = Omit<
  ComponentProps<typeof Input>,
  "autoComplete" | "inputMode" | "maxLength" | "type"
>;

function VerificationCodeInput({ onChange, ...props }: VerificationCodeInputProps) {
  function normalize(event: ChangeEvent<HTMLInputElement>) {
    event.target.value = event.target.value.replace(/\D/g, "").slice(0, 6);
    onChange?.(event);
  }

  return (
    <Input
      {...props}
      autoComplete="one-time-code"
      inputMode="numeric"
      onChange={normalize}
      type="text"
    />
  );
}

export { VerificationCodeInput };
