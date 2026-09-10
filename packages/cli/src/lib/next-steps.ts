export interface NextStepsParams {
  appUrl: string;
  /** True when RESEND_API_KEY holds a value, so sign-in codes can travel. */
  mailKeySet: boolean;
}

export interface NextSteps {
  title: string;
  lines: string[];
}

/**
 * The one thing to do after the stack answers. A command that ends on a green
 * check mark with no door behind it strands the person in front of it, so
 * `up` and `doctor` both end on this note.
 */
export function nextSteps(params: NextStepsParams): NextSteps {
  if (params.mailKeySet) {
    return {
      title: "Next",
      lines: [
        `Open ${params.appUrl} and enter your email address.`,
        "The first account on this instance is yours. It gets a code by email,",
        "and the code creates the account.",
        "",
        "absqir doctor    check the instance at any time",
        "absqir logs      follow the app",
      ],
    };
  }

  return {
    title: "Next",
    lines: [
      "Sign-in codes travel by email, and RESEND_API_KEY is empty.",
      "",
      "absqir admin create                        make your first account with a password",
      `then open ${params.appUrl} and sign in with it`,
      "",
      "absqir config set RESEND_API_KEY re_...   turn emailed codes on later",
    ],
  };
}
