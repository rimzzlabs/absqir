import { Resend } from "resend";
import { WelcomeEmail, type WelcomeEmailProps } from "@/emails/welcome";

export interface CreateMailerOptions {
  apiKey: string;
  from: string;
}

export function createMailer(options: CreateMailerOptions) {
  const { apiKey, from } = options;
  const resend = new Resend(apiKey);

  return {
    resend,
    async sendWelcome(to: string, props: WelcomeEmailProps) {
      const { data, error } = await resend.emails.send({
        from,
        to,
        subject: "Confirm your email address",
        react: WelcomeEmail(props),
      });

      if (error) {
        throw new Error(`Resend refused the message: ${error.message}`);
      }

      return data;
    },
  };
}

export type Mailer = ReturnType<typeof createMailer>;
export { WelcomeEmail, type WelcomeEmailProps };
