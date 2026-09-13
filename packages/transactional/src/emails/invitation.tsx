import { type Locale, translatorFor } from "@absqir/i18n";
import {
  EmailButton,
  EmailFallbackLink,
  EmailHeading,
  EmailNote,
  EmailText,
} from "#src/components/email-content";
import { EmailLayout } from "#src/components/email-layout";

export interface InvitationEmailProps {
  /** The language this reader gets. */
  locale: Locale;
  organizationName: string;
  inviterName: string;
  role: string;
  acceptUrl: string;
  /** The instance origin, for the brand mark. The mailer fills it in. */
  appUrl?: string;
}

export function InvitationEmail(props: InvitationEmailProps) {
  const { organizationName, inviterName, role, acceptUrl, appUrl, locale } = props;
  const t = translatorFor(locale);

  return (
    <EmailLayout
      preview={t("email:invitation.preview", {
        inviter: inviterName,
        organization: organizationName,
      })}
      appUrl={appUrl}
      locale={locale}
      footer={t("email:invitation.footer", { inviter: inviterName })}
    >
      <EmailHeading>
        {t("email:invitation.heading", { organization: organizationName })}
      </EmailHeading>
      <EmailText>
        {t("email:invitation.body", {
          inviter: inviterName,
          organization: organizationName,
          role,
        })}
      </EmailText>
      <EmailButton href={acceptUrl}>{t("email:invitation.accept")}</EmailButton>
      <EmailFallbackLink href={acceptUrl} locale={locale} />
      <EmailNote>{t("email:invitation.expiry")}</EmailNote>
    </EmailLayout>
  );
}

InvitationEmail.PreviewProps = {
  locale: "en",
  organizationName: "Yayasan Contoh",
  inviterName: "Ada",
  role: "member",
  acceptUrl: "http://localhost:4321/invite/preview",
  appUrl: "http://localhost:4321",
} satisfies InvitationEmailProps;

export default InvitationEmail;
