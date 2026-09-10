import {
  EmailButton,
  EmailFallbackLink,
  EmailHeading,
  EmailNote,
  EmailText,
} from "#src/components/email-content";
import { EmailLayout } from "#src/components/email-layout";

export interface InvitationEmailProps {
  organizationName: string;
  inviterName: string;
  role: string;
  acceptUrl: string;
  /** The instance origin, for the brand mark. The mailer fills it in. */
  appUrl?: string;
}

export function InvitationEmail(props: InvitationEmailProps) {
  const { organizationName, inviterName, role, acceptUrl, appUrl } = props;

  return (
    <EmailLayout
      preview={`${inviterName} invited you to ${organizationName} on absqir`}
      appUrl={appUrl}
      footer={`${inviterName} sent this invitation to your address. If you do not know them, ignore it and the invitation expires on its own.`}
    >
      <EmailHeading>Join {organizationName}</EmailHeading>
      <EmailText>
        {inviterName} invited you to {organizationName} as {role}. Open the link to accept. If you
        have no account yet, you will create one on the way.
      </EmailText>
      <EmailButton href={acceptUrl}>Accept the invitation</EmailButton>
      <EmailFallbackLink href={acceptUrl} />
      <EmailNote>The invitation expires in 7 days.</EmailNote>
    </EmailLayout>
  );
}

InvitationEmail.PreviewProps = {
  organizationName: "Yayasan Contoh",
  inviterName: "Ada",
  role: "member",
  acceptUrl: "http://localhost:4321/invite/preview",
  appUrl: "http://localhost:4321",
} satisfies InvitationEmailProps;

export default InvitationEmail;
