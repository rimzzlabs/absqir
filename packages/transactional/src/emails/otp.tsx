import type { CSSProperties } from "react";
import { EmailHeading, EmailNote, EmailText } from "#src/components/email-content";
import { EmailLayout } from "#src/components/email-layout";
import { color, font } from "#src/theme";

export type OtpEmailPurpose = "sign-in" | "email-verification" | "forget-password" | "change-email";

export interface OtpEmailProps {
  code: string;
  purpose: OtpEmailPurpose;
  /** Minutes until the code stops working. */
  expiresInMinutes: number;
  /** The instance origin, for the brand mark. The mailer fills it in. */
  appUrl?: string;
}

const HEADINGS: Record<OtpEmailPurpose, string> = {
  "sign-in": "Your sign-in code",
  "email-verification": "Confirm your email",
  "forget-password": "Reset your password",
  "change-email": "Confirm your new email",
};

const LEADS: Record<OtpEmailPurpose, string> = {
  "sign-in": "Enter this code to finish signing in. It works once.",
  "email-verification": "Enter this code to confirm this address. It works once.",
  "forget-password": "Enter this code to set a new password. It works once.",
  "change-email": "Enter this code to move your account to this address. It works once.",
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
  const { code, purpose, expiresInMinutes, appUrl } = props;

  return (
    <EmailLayout
      preview={`${code} is your absqir code`}
      appUrl={appUrl}
      footer="absqir sends a code only when someone asks for one. No one from absqir will ever ask you to forward it."
    >
      <EmailHeading>{HEADINGS[purpose]}</EmailHeading>
      <EmailText>{LEADS[purpose]}</EmailText>
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
      <EmailNote>
        The code expires in {expiresInMinutes} minutes. If you did not ask for it, ignore this
        email. Nothing changes until the code is used.
      </EmailNote>
    </EmailLayout>
  );
}

OtpEmail.PreviewProps = {
  code: "482913",
  purpose: "sign-in",
  expiresInMinutes: 10,
  appUrl: "http://localhost:4321",
} satisfies OtpEmailProps;

// The react-email preview server resolves each template by its default export.
export default OtpEmail;
