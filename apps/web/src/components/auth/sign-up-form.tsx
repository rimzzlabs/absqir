import { Button } from "@absqir/ui/button";
import { Form, FormField } from "@absqir/ui/form";
import { Input } from "@absqir/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Providers } from "@/components/providers";
import { MIN_PASSWORD_LENGTH, type SignUpValues, signUpSchema } from "@/lib/auth-schemas";
import { useSignUp } from "@/mutations/use-sign-up";

function SignUpFields() {
  const form = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const signUp = useSignUp();

  const awaitingEmail = signUp.isSuccess && signUp.data?.user.emailVerified === false;

  if (awaitingEmail) {
    return (
      <p className="text-sm">Check your inbox. Open the link in the email to finish signing up.</p>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => signUp.mutate(values))}
        className="space-y-5"
        noValidate
      >
        <FormField
          control={form.control}
          name="name"
          label="Name"
          render={(field) => <Input {...field} id="name" autoComplete="name" />}
        />

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
          description={`At least ${MIN_PASSWORD_LENGTH} characters.`}
          render={(field) => (
            <Input {...field} id="password" type="password" autoComplete="new-password" />
          )}
        />

        {signUp.error ? (
          <p role="alert" className="text-destructive text-sm">
            {signUp.error.message}
          </p>
        ) : null}

        <Button type="submit" disabled={signUp.isPending} className="w-full">
          {signUp.isPending ? "Creating the account…" : "Create account"}
        </Button>
      </form>
    </Form>
  );
}

export function SignUpForm() {
  return (
    <Providers>
      <SignUpFields />
    </Providers>
  );
}
