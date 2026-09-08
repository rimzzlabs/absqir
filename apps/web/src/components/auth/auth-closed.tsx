import { Button } from "@absqir/ui/button";
import { AuthHeading } from "@/components/auth/auth-heading";

export interface AuthClosedProps {
  email: string;
  onBack: () => void;
}

/** The email is unknown and this instance only admits invited people. */
export function AuthClosed(props: AuthClosedProps) {
  return (
    <div className="space-y-5">
      <AuthHeading
        title="This email needs an invitation"
        description={`There is no account for ${props.email}, and this absqir only lets invited people in.`}
      />

      <p className="text-muted-foreground text-sm">
        Ask an organizer of your organization to invite you. The invitation email carries a link
        that opens this page with your address ready to go.
      </p>

      <Button type="button" variant="outline" className="w-full" onClick={props.onBack}>
        Try another email
      </Button>
    </div>
  );
}
