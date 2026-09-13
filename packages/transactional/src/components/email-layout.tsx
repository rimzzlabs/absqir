import { A } from "@mobily/ts-belt";
import { Body, Head, Html, Img, Preview } from "@react-email/components";
import type { CSSProperties, ReactNode } from "react";
import { match, P } from "ts-pattern";
import { CONTENT_WIDTH, color, font } from "#src/theme";

export interface EmailLayoutProps {
  /** The line the inbox shows beside the subject. */
  preview: string;
  /** The instance origin. Undefined on a self-host that never set APP_URL. */
  appUrl?: string;
  /** The small print under the card that says why the message arrived. */
  footer: ReactNode;
  children: ReactNode;
}

/**
 * Apple Mail and Outlook.com repaint a light email when the reader runs a
 * dark system. Left alone they pick their own colors. These rules hand them
 * the brand's dark column instead.
 *
 * Outlook.com does not read the media query. It rewrites the message and
 * stamps the root with `data-ogsc` where it changed a text color and
 * `data-ogsb` where it changed a background, so every rule is written three
 * times: once for the query, once under each attribute.
 *
 * The Gmail app inverts whatever it is told and never asks. That is why the
 * brand chip is a baked tile: an image never inverts, so the mark always
 * reads.
 */
const DARK_RULES: readonly [string, string][] = [
  [".abs-page", `background-color: ${color.paperDark} !important;`],
  [
    ".abs-card",
    `background-color: ${color.cardDark} !important; border-color: ${color.borderDark} !important;`,
  ],
  [
    ".abs-well",
    `background-color: ${color.paperDark} !important; border-color: ${color.borderDark} !important;`,
  ],
  [".abs-ink", `color: ${color.inkDark} !important;`],
  [".abs-muted", `color: ${color.mutedDark} !important;`],
  [".abs-link", `color: ${color.cobaltDark} !important;`],
  [".abs-rule", `border-color: ${color.borderDark} !important;`],
];

function darkRules(prefix: string) {
  return A.map(DARK_RULES, (rule) => `${prefix}${rule[0]} { ${rule[1]} }`).join("\n");
}

const COLOR_SCHEME_CSS = `
@media (prefers-color-scheme: dark) {
${darkRules("")}
}
${darkRules("[data-ogsc] ")}
${darkRules("[data-ogsb] ")}
`;

const page: CSSProperties = {
  backgroundColor: color.paper,
  fontFamily: font.sans,
  margin: 0,
  padding: 0,
  width: "100%",
};

const shell: CSSProperties = {
  margin: "0 auto",
  maxWidth: `${CONTENT_WIDTH}px`,
  width: "100%",
};

const card: CSSProperties = {
  backgroundColor: color.card,
  border: `1px solid ${color.border}`,
  borderRadius: "14px",
  padding: "28px",
};

const wordmark: CSSProperties = {
  color: color.ink,
  fontFamily: font.mono,
  fontSize: "17px",
  fontWeight: 600,
  letterSpacing: "-0.01em",
  lineHeight: "20px",
};

const footnote: CSSProperties = {
  color: color.muted,
  fontFamily: font.sans,
  fontSize: "12px",
  lineHeight: "18px",
  margin: 0,
};

/**
 * The shell every message renders inside: a paper ground, the brand bar, one
 * card, and the small print. Nothing here is a `div`. Every box is a table
 * cell, because the Word engine behind Outlook for Windows lays out tables
 * and little else.
 */
export function EmailLayout(props: EmailLayoutProps) {
  const { preview, appUrl, footer, children } = props;

  return (
    <Html lang="en" dir="ltr">
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <style
          type="text/css"
          // React escapes text children, which would turn a CSS selector into
          // entities. The stylesheet has to reach the client verbatim.
          // biome-ignore lint/security/noDangerouslySetInnerHtml: static stylesheet, no input
          dangerouslySetInnerHTML={{ __html: COLOR_SCHEME_CSS }}
        />
      </Head>
      <Preview>{preview}</Preview>
      <Body className="abs-page" style={page}>
        <table
          role="presentation"
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          border={0}
          className="abs-page"
          bgcolor={color.paper}
          style={page}
        >
          <tbody>
            <tr>
              <td align="center" style={{ padding: "32px 16px" }}>
                <table
                  role="presentation"
                  width={CONTENT_WIDTH}
                  cellPadding={0}
                  cellSpacing={0}
                  border={0}
                  style={shell}
                >
                  <tbody>
                    <tr>
                      <td className="abs-card" style={card}>
                        <BrandBar appUrl={appUrl} />
                        {children}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: "20px 8px 0" }}>
                        <p className="abs-muted" style={footnote}>
                          {footer}
                        </p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </Body>
    </Html>
  );
}

/**
 * The mark rides on a baked paper tile, which the brand allows on any ground
 * it does not own. The tile keeps the ink strokes readable on a dark card and
 * inside the Gmail app, which inverts colors but never images. The wordmark
 * beside it is live text, so a reader who blocks images still sees the name.
 */
function BrandBar(props: { appUrl?: string }) {
  const markUrl = match(props.appUrl)
    .with(P.string.minLength(1), (appUrl) => `${appUrl.replace(/\/$/, "")}/brand/mark.png`)
    .otherwise(() => null);

  return (
    <table role="presentation" cellPadding={0} cellSpacing={0} border={0} width="100%">
      <tbody>
        <tr>
          {match(markUrl)
            .with(P.string.minLength(1), (markUrl) => (
              <td
                width="36"
                style={{ paddingBottom: "18px", paddingRight: "10px", verticalAlign: "middle" }}
              >
                <Img
                  src={markUrl}
                  width="36"
                  height="36"
                  alt=""
                  style={{ border: 0, borderRadius: "9px", display: "block" }}
                />
              </td>
            ))
            .otherwise(() => null)}
          <td style={{ paddingBottom: "18px", verticalAlign: "middle" }}>
            <span className="abs-ink" style={wordmark}>
              absqir
            </span>
          </td>
        </tr>
        <tr>
          <td
            colSpan={match(markUrl)
              .with(P.string.minLength(1), () => 2)
              .otherwise(() => 1)}
            className="abs-rule"
            data-skip-in-text="true"
            style={{
              borderTop: `1px solid ${color.border}`,
              fontSize: "1px",
              height: "1px",
              lineHeight: "1px",
            }}
          >
            &nbsp;
          </td>
        </tr>
      </tbody>
    </table>
  );
}
