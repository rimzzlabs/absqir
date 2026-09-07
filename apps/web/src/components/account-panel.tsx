import { Button } from "@absqir/ui/button";
import { Reveal } from "@absqir/ui/reveal";
import { SignOutIcon } from "@phosphor-icons/react";
import { match, P } from "ts-pattern";
import { Providers } from "@/components/providers";
import { useSignOut } from "@/mutations/use-sign-out";
import { useHealth } from "@/queries/use-health";
import { useSession } from "@/queries/use-session";

export interface AccountPanelProps {
  /** Rendered by the server, so the panel never flashes a signed-out state. */
  initialEmail: string;
  initialName: string;
}

function AccountCard(props: AccountPanelProps) {
  const health = useHealth();
  const session = useSession();
  const signOut = useSignOut();

  const name = session.data?.user.name ?? props.initialName;
  const email = session.data?.user.email ?? props.initialEmail;

  return (
    <Reveal className="border-border rounded-lg border p-5">
      <p className="text-sm font-medium">{name}</p>
      <p className="text-muted-foreground font-mono text-sm">{email}</p>

      <p className="text-muted-foreground mt-4 font-mono text-xs">
        API:{" "}
        {match(health)
          .with({ isPending: true }, () => "checking…")
          .with({ isError: true, error: P.select() }, (error) => error.message)
          .otherwise(() => "up")}
      </p>

      <Button
        size="sm"
        variant="outline"
        className="mt-4"
        disabled={signOut.isPending}
        onClick={() => signOut.mutate()}
      >
        <SignOutIcon />
        {signOut.isPending ? "Signing out…" : "Sign out"}
      </Button>
    </Reveal>
  );
}

export function AccountPanel(props: AccountPanelProps) {
  return (
    <Providers>
      <AccountCard {...props} />
    </Providers>
  );
}
