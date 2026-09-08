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

export interface InvitationEmailProps {
  organizationName: string;
  inviterName: string;
  role: string;
  acceptUrl: string;
}

export function InvitationEmail(props: InvitationEmailProps) {
  const { organizationName, inviterName, role, acceptUrl } = props;

  return (
    <Html lang="en">
      <Head />
      <Preview>{`${inviterName} invited you to ${organizationName} on absqir`}</Preview>
      <Body style={{ backgroundColor: "#f6f6f6", fontFamily: "system-ui, sans-serif" }}>
        <Container style={{ backgroundColor: "#ffffff", padding: "32px", borderRadius: "8px" }}>
          <Heading as="h1" style={{ fontSize: "20px" }}>
            Join {organizationName}
          </Heading>
          <Text>
            {inviterName} invited you to {organizationName} as {role}. Open the link to accept. If
            you have no account yet, you will create one on the way.
          </Text>
          <Button
            href={acceptUrl}
            style={{
              backgroundColor: "#111111",
              color: "#ffffff",
              padding: "12px 20px",
              borderRadius: "6px",
            }}
          >
            Accept the invitation
          </Button>
          <Text style={{ color: "#666666", fontSize: "14px" }}>
            The invitation expires in 7 days. If you do not know {inviterName}, ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

InvitationEmail.PreviewProps = {
  organizationName: "Yayasan Contoh",
  inviterName: "Ada",
  role: "member",
  acceptUrl: "http://localhost:4321/invite/preview",
} satisfies InvitationEmailProps;

export default InvitationEmail;
