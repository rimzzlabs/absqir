import { useTranslate } from "@absqir/i18n/react";
import { Button } from "@absqir/ui/button";
import { AuthHeading } from "@/components/auth/auth-heading";

export interface AuthClosedProps {
  email: string;
  /** What the provider round trip said, when a provider sent the reader here. */
  reason?: string | null;
  onBack: () => void;
}

/** The email is unknown and this instance only admits invited people. */
export function AuthClosed(props: AuthClosedProps) {
  const t = useTranslate();

  return (
    <div className="space-y-5">
      <AuthHeading
        title={t("auth:closed.title")}
        description={props.reason ?? t("auth:closed.description", { email: props.email })}
      />

      <p className="text-muted-foreground text-sm">{t("auth:closed.hint")}</p>

      <Button type="button" variant="outline" className="w-full" onClick={props.onBack}>
        {t("auth:closed.tryAnother")}
      </Button>
    </div>
  );
}
