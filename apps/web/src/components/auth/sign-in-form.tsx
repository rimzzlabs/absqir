import { Button } from "@absqir/ui/button";
import { Form, FormField } from "@absqir/ui/form";
import { Input } from "@absqir/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Providers } from "@/components/providers";
import { type SignInValues, signInSchema } from "@/lib/auth-schemas";
import { useSignIn } from "@/mutations/use-sign-in";

export interface SignInFormProps {
  /** Where to land after a successful sign in. */
  next?: string;
}

function SignInFields(props: SignInFormProps) {
  const next = props.next ?? "/";

  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "", rememberMe: true },
  });

  const signIn = useSignIn({ redirectTo: next });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => signIn.mutate(values))}
        className="space-y-5"
        noValidate
      >
        <FormField
          control={form.control}
          name="email"
          label="Email"
          render={(field) => <Input {...field} id="email" type="email" autoComplete="email" />}
        />

        <FormField
          control={form.control}
          name="password"
          label="Password"
          render={(field) => (
            <Input {...field} id="password" type="password" autoComplete="current-password" />
          )}
        />

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4"
            checked={form.watch("rememberMe")}
            onChange={(event) => form.setValue("rememberMe", event.target.checked)}
          />
          Keep me signed in
        </label>

        {signIn.error ? (
          <p role="alert" className="text-destructive text-sm">
            {signIn.error.message}
          </p>
        ) : null}

        <Button type="submit" disabled={signIn.isPending} className="w-full">
          {signIn.isPending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </Form>
  );
}

export function SignInForm(props: SignInFormProps) {
  return (
    <Providers>
      <SignInFields {...props} />
    </Providers>
  );
}
