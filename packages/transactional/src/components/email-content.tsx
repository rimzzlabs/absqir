import { Button, Heading, Text } from "@react-email/components";
import type { CSSProperties, ReactNode } from "react";
import { color, font } from "@/theme";

const heading: CSSProperties = {
  color: color.ink,
  fontFamily: font.sans,
  fontSize: "22px",
  fontWeight: 600,
  letterSpacing: "-0.01em",
  lineHeight: "28px",
  margin: "22px 0 0",
};

const body: CSSProperties = {
  color: color.ink,
  fontFamily: font.sans,
  fontSize: "15px",
  lineHeight: "24px",
  margin: "12px 0 0",
};

const note: CSSProperties = {
  color: color.muted,
  fontFamily: font.sans,
  fontSize: "13px",
  lineHeight: "20px",
  margin: "20px 0 0",
};

const button: CSSProperties = {
  backgroundColor: color.cobalt,
  borderRadius: "10px",
  color: "#FFFFFF",
  display: "inline-block",
  fontFamily: font.sans,
  fontSize: "15px",
  fontWeight: 600,
  lineHeight: "20px",
  padding: "13px 22px",
  textDecoration: "none",
};

export function EmailHeading(props: { children: ReactNode }) {
  return (
    <Heading as="h1" className="abs-ink" style={heading}>
      {props.children}
    </Heading>
  );
}

export function EmailText(props: { children: ReactNode }) {
  return (
    <Text className="abs-ink" style={body}>
      {props.children}
    </Text>
  );
}

/** The last line of a card: why this arrived, and what to do if it should not have. */
export function EmailNote(props: { children: ReactNode }) {
  return (
    <Text className="abs-muted" style={note}>
      {props.children}
    </Text>
  );
}

/**
 * Cobalt stays cobalt in dark mode. White on `#2563EB` clears AA either way,
 * and a button that changes color reads as a different button.
 */
export function EmailButton(props: { href: string; children: ReactNode }) {
  return (
    <table role="presentation" cellPadding={0} cellSpacing={0} border={0}>
      <tbody>
        <tr>
          <td style={{ padding: "24px 0 4px" }}>
            <Button href={props.href} style={button}>
              {props.children}
            </Button>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/**
 * The fallback under every button. A reader whose client strips the link, or
 * who forwards the message as text, still has the address.
 */
export function EmailFallbackLink(props: { href: string }) {
  return (
    // The plain-text part already spells the address out beside the button,
    // so this block would say it twice there.
    <Text className="abs-muted" data-skip-in-text="true" style={note}>
      Or paste this into your browser:
      <br />
      <a
        className="abs-link"
        href={props.href}
        style={{ color: color.cobalt, wordBreak: "break-all" }}
      >
        {props.href}
      </a>
    </Text>
  );
}
