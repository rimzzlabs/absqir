import { emailOTPClient, organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

// No baseURL: the API lives on the same origin as the page.
export const authClient = createAuthClient({
  basePath: "/api/auth",
  plugins: [organizationClient(), emailOTPClient()],
});
