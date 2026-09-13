import { render } from "@react-email/render";
import type { ReactElement } from "react";
import { Resend } from "resend";
import { match, P } from "ts-pattern";
import { InvitationEmail, type InvitationEmailProps } from "#src/emails/invitation";
import { NotificationEmail, type NotificationEmailProps } from "#src/emails/notification";
import { OtpEmail, type OtpEmailProps, type OtpEmailPurpose } from "#src/emails/otp";

export interface CreateMailerOptions {
  apiKey: string;
  from: string;
  /**
   * The instance origin, used for the brand mark and the preference link.
   * Leave it out and the templates drop both, which is what a self-host on
   * an address no mail client can reach wants.
   */
  appUrl?: string;
}

/** Every template takes its brand from the mailer, never from the caller. */
type Payload<T> = Omit<T, "appUrl">;

interface SendOptions {
  to: string;
  subject: string;
  element: ReactElement;
  headers?: Record<string, string>;
}

const OTP_SUBJECTS: Record<OtpEmailPurpose, (code: string) => string> = {
  "sign-in": (code) => `${code} is your absqir sign-in code`,
  "email-verification": (code) => `${code} confirms your email`,
  "forget-password": (code) => `${code} resets your password`,
  "change-email": (code) => `${code} confirms your new email`,
};

export function createMailer(options: CreateMailerOptions) {
  const { apiKey, from, appUrl } = options;
  const resend = new Resend(apiKey);
  const preferencesUrl = match(appUrl)
    .with(
      P.string.minLength(1),
      (appUrl) => `${appUrl.replace(/\/$/, "")}/settings?tab=notifications`,
    )
    .otherwise(() => null);

  /**
   * Both parts are built here rather than handed to Resend as `react`, so
   * every message carries a plain-text alternative. HTML-only mail reads as
   * an empty message where remote content is off, and it costs spam score on
   * a young sending domain.
   */
  async function send(sendOptions: SendOptions) {
    const { to, subject, element, headers } = sendOptions;
    const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);

    const { data, error } = await resend.emails.send({ from, to, subject, html, text, headers });

    if (error) {
      throw new Error(`Resend refused the message: ${error.message}`);
    }

    return data;
  }

  return {
    resend,
    sendOtp(to: string, props: Payload<OtpEmailProps>) {
      return send({
        to,
        subject: OTP_SUBJECTS[props.purpose](props.code),
        element: OtpEmail({ ...props, appUrl }),
      });
    },
    sendInvitation(to: string, props: Payload<InvitationEmailProps>) {
      return send({
        to,
        subject: `Join ${props.organizationName} on absqir`,
        element: InvitationEmail({ ...props, appUrl }),
      });
    },
    sendNotification(to: string, props: Payload<NotificationEmailProps>) {
      return send({
        to,
        subject: props.title,
        element: NotificationEmail({ ...props, appUrl }),
        // A notification is the one message a reader can turn off, so it
        // says so in a header the inbox can act on, not only in the footer.
        headers: match(preferencesUrl)
          .with(P.string.minLength(1), (preferencesUrl) => ({
            "List-Unsubscribe": `<${preferencesUrl}>`,
          }))
          .otherwise(() => undefined),
      });
    },
  };
}

export type Mailer = ReturnType<typeof createMailer>;
export {
  InvitationEmail,
  type InvitationEmailProps,
  NotificationEmail,
  type NotificationEmailProps,
  OtpEmail,
  type OtpEmailProps,
  type OtpEmailPurpose,
};
