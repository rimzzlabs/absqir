import { type Locale, translatorFor } from "@absqir/i18n";
import type { CSSProperties } from "react";
import { EmailHeading, EmailNote, EmailText } from "#src/components/email-content";
import { EmailLayout } from "#src/components/email-layout";
import { color, font } from "#src/theme";

export type OtpEmailPurpose = "sign-in" | "email-verification" | "forget-password" | "change-email";

export interface OtpEmailProps {
  /** The language this reader gets. */
  locale: Locale;
  code: string;
  purpose: OtpEmailPurpose;
  /** Minutes until the code stops working. */
  expiresInMinutes: number;
  /** The instance origin, for the brand mark. The mailer fills it in. */
  appUrl?: string;
}

/** The key under `email:otp` that words each purpose. */
const PURPOSE_KEYS: Record<OtpEmailPurpose, "signIn" | "verify" | "reset" | "change"> = {
  "sign-in": "signIn",
  "email-verification": "verify",
  "forget-password": "reset",
  "change-email": "change",
};

const well: CSSProperties = {
  backgroundColor: color.paper,
  border: `1px solid ${color.border}`,
  borderRadius: "12px",
  padding: "22px 12px",
  textAlign: "center",
};

/**
 * `letter-spacing` puts a gap after the last digit too, which drags the code
 * off its own centre. The matching `padding-left` puts the gap back on the
 * left, so the digits sit centred in every client that honours either one.
 */
const digits: CSSProperties = {
  color: color.ink,
  fontFamily: font.mono,
  fontSize: "34px",
  fontWeight: 600,
  letterSpacing: "0.3em",
  lineHeight: "40px",
  margin: 0,
  paddingLeft: "0.3em",
};

export function OtpEmail(props: OtpEmailProps) {
  const { code, purpose, expiresInMinutes, appUrl, locale } = props;
  const t = translatorFor(locale);
  const key = PURPOSE_KEYS[purpose];

  return (
    <EmailLayout
      preview={t("email:otp.preview", { code })}
      appUrl={appUrl}
      locale={locale}
      footer={t("email:otp.footer")}
    >
      <EmailHeading>{t(`email:otp.${key}Heading`)}</EmailHeading>
      <EmailText>{t(`email:otp.${key}Lead`)}</EmailText>
      <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} border={0}>
        <tbody>
          <tr>
            <td
              data-skip-in-text="true"
              style={{ fontSize: "1px", height: "20px", lineHeight: "1px" }}
            >
              &nbsp;
            </td>
          </tr>
          <tr>
            <td className="abs-well" style={well}>
              <p className="abs-ink" style={digits}>
                {code}
              </p>
            </td>
          </tr>
        </tbody>
      </table>
      <EmailNote>{t("email:otp.expiry", { count: expiresInMinutes })}</EmailNote>
    </EmailLayout>
  );
}

OtpEmail.PreviewProps = {
  locale: "en",
  code: "482913",
  purpose: "sign-in",
  expiresInMinutes: 10,
  appUrl: "http://localhost:4321",
} satisfies OtpEmailProps;

// The react-email preview server resolves each template by its default export.
export default OtpEmail;
