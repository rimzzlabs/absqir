import { Resend } from "resend";
import { InvitationEmail, type InvitationEmailProps } from "@/emails/invitation";
import { NotificationEmail, type NotificationEmailProps } from "@/emails/notification";
import { OtpEmail, type OtpEmailProps, type OtpEmailPurpose } from "@/emails/otp";

export interface CreateMailerOptions {
  apiKey: string;
  from: string;
}

const OTP_SUBJECTS: Record<OtpEmailPurpose, (code: string) => string> = {
  "sign-in": (code) => `${code} is your absqir sign-in code`,
  "email-verification": (code) => `${code} confirms your email`,
  "forget-password": (code) => `${code} resets your password`,
  "change-email": (code) => `${code} confirms your new email`,
};

export function createMailer(options: CreateMailerOptions) {
  const { apiKey, from } = options;
  const resend = new Resend(apiKey);

  async function send(to: string, subject: string, react: React.ReactElement) {
    const { data, error } = await resend.emails.send({ from, to, subject, react });

    if (error) {
      throw new Error(`Resend refused the message: ${error.message}`);
    }

    return data;
  }

  return {
    resend,
    sendOtp(to: string, props: OtpEmailProps) {
      return send(to, OTP_SUBJECTS[props.purpose](props.code), OtpEmail(props));
    },
    sendInvitation(to: string, props: InvitationEmailProps) {
      return send(to, `Join ${props.organizationName} on absqir`, InvitationEmail(props));
    },
    sendNotification(to: string, props: NotificationEmailProps) {
      return send(to, props.title, NotificationEmail(props));
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
