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

export interface NotificationEmailProps {
  title: string;
  body: string | null;
  organizationName: string;
  /** Where the reader goes to act on it. Absolute. */
  url: string;
  /** The label on the button, for example "Open the event". */
  action: string;
}

/** One notification, the same words the in-app list shows. */
export function NotificationEmail(props: NotificationEmailProps) {
  const { title, body, organizationName, url, action } = props;

  return (
    <Html lang="en">
      <Head />
      <Preview>{title}</Preview>
      <Body style={{ backgroundColor: "#f6f6f6", fontFamily: "system-ui, sans-serif" }}>
        <Container style={{ backgroundColor: "#ffffff", padding: "32px", borderRadius: "8px" }}>
          <Heading as="h1" style={{ fontSize: "20px" }}>
            {title}
          </Heading>
          {body ? <Text>{body}</Text> : null}
          <Button
            href={url}
            style={{
              backgroundColor: "#111111",
              color: "#ffffff",
              padding: "12px 20px",
              borderRadius: "6px",
            }}
          >
            {action}
          </Button>
          <Text style={{ color: "#666666", fontSize: "14px" }}>
            You get this because you belong to {organizationName} on absqir.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

NotificationEmail.PreviewProps = {
  title: "Morning standup starts in an hour",
  body: "Tue 9 Sep, 09:00 to 10:00. Check in from the room screen, or show your pass.",
  organizationName: "Yayasan Contoh",
  url: "http://localhost:4321/my/sessions",
  action: "Open my events",
} satisfies NotificationEmailProps;

export default NotificationEmail;
