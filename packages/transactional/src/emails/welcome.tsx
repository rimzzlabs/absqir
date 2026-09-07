import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from "@react-email/components";

export interface WelcomeEmailProps {
  name: string;
  verifyUrl: string;
}

export function WelcomeEmail(props: WelcomeEmailProps) {
  const { name, verifyUrl } = props;

  return (
    <Html lang="en">
      <Head />
      <Preview>Confirm your email address to finish signing up.</Preview>
      <Body style={{ backgroundColor: "#f6f6f6", fontFamily: "system-ui, sans-serif" }}>
        <Container style={{ backgroundColor: "#ffffff", padding: "32px", borderRadius: "8px" }}>
          <Heading as="h1">Welcome, {name}</Heading>
          <Text>Confirm your email address to finish signing up.</Text>
          <Button
            href={verifyUrl}
            style={{
              backgroundColor: "#111111",
              color: "#ffffff",
              padding: "12px 20px",
              borderRadius: "6px",
            }}
          >
            Confirm email
          </Button>
        </Container>
      </Body>
    </Html>
  );
}

WelcomeEmail.PreviewProps = {
  name: "Ada",
  verifyUrl: "http://localhost:3000/verify?token=preview",
} satisfies WelcomeEmailProps;

// The react-email preview server resolves each template by its default export.
export default WelcomeEmail;
