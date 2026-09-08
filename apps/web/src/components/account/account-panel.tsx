import { EmailCard } from "@/components/account/email-card";
import { PasswordCard } from "@/components/account/password-card";
import { ProfileCard } from "@/components/account/profile-card";
import { SessionsCard } from "@/components/account/sessions-card";

export interface AccountPanelProps {
  name: string;
  email: string;
  image: string | null;
}

/** Everything that is about the person, not the organization. */
export function AccountPanel(props: AccountPanelProps) {
  return (
    <div className="grid max-w-3xl gap-6">
      <ProfileCard name={props.name} image={props.image} />
      <EmailCard email={props.email} />
      <PasswordCard />
      <SessionsCard />
    </div>
  );
}
