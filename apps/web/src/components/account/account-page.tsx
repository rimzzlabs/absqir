import { EmailCard } from "@/components/account/email-card";
import { PasswordCard } from "@/components/account/password-card";
import { ProfileCard } from "@/components/account/profile-card";
import { SessionsCard } from "@/components/account/sessions-card";
import { Providers } from "@/components/providers";
import { PageHeader } from "@/components/shared/page-header";

export interface AccountPageProps {
  name: string;
  email: string;
  image: string | null;
}

/** Everything that is about the person, not the organization. */
export function AccountPage(props: AccountPageProps) {
  return (
    <Providers>
      <PageHeader title="Account" description="Who you are, how you sign in, and where." />
      <div className="grid max-w-3xl gap-6">
        <ProfileCard name={props.name} image={props.image} />
        <EmailCard email={props.email} />
        <PasswordCard />
        <SessionsCard />
      </div>
    </Providers>
  );
}
