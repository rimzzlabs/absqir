import { type Locale, translatorFor } from "@absqir/i18n";
import { match, P } from "ts-pattern";
import {
  EmailButton,
  EmailFallbackLink,
  EmailHeading,
  EmailText,
} from "#src/components/email-content";
import { EmailLayout } from "#src/components/email-layout";
import { color } from "#src/theme";

export interface NotificationEmailProps {
  /** The language this reader gets. */
  locale: Locale;
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
  const { title, body, organizationName, url, action, appUrl, locale } = props;
  const t = translatorFor(locale);
  const preferencesUrl = match(appUrl)
    .with(
      P.string.minLength(1),
      (appUrl) => `${appUrl.replace(/\/$/, "")}/settings?tab=notifications`,
    )
    .otherwise(() => null);

  return (
    <EmailLayout
      preview={title}
      appUrl={appUrl}
      locale={locale}
      footer={
        <>
          {t("email:notification.footer", { organization: organizationName })}
          {match(preferencesUrl)
            .with(P.string.minLength(1), (preferencesUrl) => (
              <>
                {" "}
                <a className="abs-link" href={preferencesUrl} style={{ color: color.cobalt }}>
                  {t("email:notification.preferences")}
                </a>
                .
              </>
            ))
            .otherwise(() => null)}
        </>
      }
    >
      <EmailHeading>{title}</EmailHeading>
      {match(body)
        .with(P.string.minLength(1), (body) => <EmailText>{body}</EmailText>)
        .otherwise(() => null)}
      <EmailButton href={url}>{action}</EmailButton>
      <EmailFallbackLink href={url} locale={locale} />
    </EmailLayout>
  );
}

NotificationEmail.PreviewProps = {
  locale: "en",
  title: "Morning standup starts in an hour",
  body: "Tue 9 Sep, 09:00 to 10:00. Check in from the room screen, or show your pass.",
  organizationName: "Yayasan Contoh",
  url: "http://localhost:4321/my/events",
  action: "Open my events",
  appUrl: "http://localhost:4321",
} satisfies NotificationEmailProps;

export default NotificationEmail;
