import { useTranslate } from "@absqir/i18n/react";
import { SpinnerIcon } from "@phosphor-icons/react";
import { cn } from "cn";

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  const t = useTranslate();

  return (
    <SpinnerIcon
      data-slot="spinner"
      role="status"
      aria-label={t("common:fields.loading")}
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  );
}

export { Spinner };
