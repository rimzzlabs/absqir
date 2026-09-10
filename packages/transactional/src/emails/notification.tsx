import {
  EmailButton,
  EmailFallbackLink,
  EmailHeading,
  EmailText,
} from "#src/components/email-content";
import { EmailLayout } from "#src/components/email-layout";
import { color } from "#src/theme";

export interface NotificationEmailProps {
  title: string;
  body: string | null;
  organizationName: string;
  /** Where the reader goes to act on it. Absolute. */
  url: string;
  /** The label on the button, for example "Open the event". */
  action: string;
  /** The instance origin, for the brand mark. The mailer fills it in. */
  appUrl?: string;
}

/** One notification, the same words the in-app list shows. */
export function NotificationEmail(props: NotificationEmailProps) {
  const { title, body, organizationName, url, action, appUrl } = props;
  const preferencesUrl = appUrl ? `${appUrl.replace(/\/$/, "")}/settings?tab=notifications` : null;

  return (
    <EmailLayout
      preview={title}
      appUrl={appUrl}
      footer={
        <>
          You get this because you belong to {organizationName} on absqir.
          {preferencesUrl ? (
            <>
              {" "}
              <a className="abs-link" href={preferencesUrl} style={{ color: color.cobalt }}>
                Choose which emails reach you
              </a>
              .
            </>
          ) : null}
        </>
      }
    >
      <EmailHeading>{title}</EmailHeading>
      {body ? <EmailText>{body}</EmailText> : null}
      <EmailButton href={url}>{action}</EmailButton>
      <EmailFallbackLink href={url} />
    </EmailLayout>
  );
}

NotificationEmail.PreviewProps = {
  title: "Morning standup starts in an hour",
  body: "Tue 9 Sep, 09:00 to 10:00. Check in from the room screen, or show your pass.",
  organizationName: "Yayasan Contoh",
  url: "http://localhost:4321/my/sessions",
  action: "Open my events",
  appUrl: "http://localhost:4321",
} satisfies NotificationEmailProps;

export default NotificationEmail;
