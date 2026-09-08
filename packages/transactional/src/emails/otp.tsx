import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export type OtpEmailPurpose = "sign-in" | "email-verification" | "forget-password" | "change-email";

export interface OtpEmailProps {
  code: string;
  purpose: OtpEmailPurpose;
  /** Minutes until the code stops working. */
  expiresInMinutes: number;
}

const HEADINGS: Record<OtpEmailPurpose, string> = {
  "sign-in": "Your sign-in code",
  "email-verification": "Confirm your email",
  "forget-password": "Reset your password",
  "change-email": "Confirm your new email",
};

export function OtpEmail(props: OtpEmailProps) {
  const { code, purpose, expiresInMinutes } = props;
  const heading = HEADINGS[purpose];

  return (
    <Html lang="en">
      <Head />
      <Preview>{`${code} is your absqir code`}</Preview>
      <Body style={{ backgroundColor: "#f6f6f6", fontFamily: "system-ui, sans-serif" }}>
        <Container style={{ backgroundColor: "#ffffff", padding: "32px", borderRadius: "8px" }}>
          <Heading as="h1" style={{ fontSize: "20px" }}>
            {heading}
          </Heading>
          <Text>Enter this code in absqir. It works once.</Text>
          <Section
            style={{
              backgroundColor: "#f0f0f0",
              borderRadius: "6px",
              padding: "16px",
              textAlign: "center",
            }}
          >
            <Text
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, monospace",
                fontSize: "32px",
                letterSpacing: "0.3em",
                margin: 0,
              }}
            >
              {code}
            </Text>
          </Section>
          <Text style={{ color: "#666666", fontSize: "14px" }}>
            The code expires in {expiresInMinutes} minutes. If you did not ask for it, ignore this
            email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

OtpEmail.PreviewProps = {
  code: "482913",
  purpose: "sign-in",
  expiresInMinutes: 10,
} satisfies OtpEmailProps;

// The react-email preview server resolves each template by its default export.
export default OtpEmail;
