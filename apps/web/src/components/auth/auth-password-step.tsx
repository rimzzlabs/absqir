import { Button } from "@absqir/ui/button";
import { Checkbox } from "@absqir/ui/checkbox";
import { Form, FormField } from "@absqir/ui/form";
import { Input } from "@absqir/ui/input";
import { Label } from "@absqir/ui/label";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { AuthHeading } from "@/components/auth/auth-heading";
import { FormError } from "@/components/shared/form-error";
import { type PasswordValues, passwordSchema } from "@/lib/auth-schemas";
import { useSendCode } from "@/mutations/use-send-code";
import { useSignIn } from "@/mutations/use-sign-in";

export interface AuthPasswordStepProps {
  email: string;
  next: string;
  onBack: () => void;
  onCodeSent: () => void;
}

export function AuthPasswordStep(props: AuthPasswordStepProps) {
  const form = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "", rememberMe: true },
  });

  const signIn = useSignIn({ redirectTo: props.next });
  const sendCode = useSendCode();

  const onCode = () => {
    sendCode.mutate(
      { email: props.email, purpose: "forget-password" },
      { onSuccess: props.onCodeSent },
    );
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => signIn.mutate({ email: props.email, ...values }))}
        className="space-y-5"
        noValidate
      >
        <AuthHeading title="Welcome back" description={props.email} />

        <FormField
          control={form.control}
          name="password"
          label="Password"
          render={(field) => (
            <Input
              {...field}
              id="password"
              type="password"
              autoComplete="current-password"
              autoFocus
            />
          )}
        />

        <div className="flex items-center gap-2">
          <Checkbox
            id="remember"
            checked={form.watch("rememberMe")}
            onCheckedChange={(checked) => form.setValue("rememberMe", checked === true)}
          />
          <Label htmlFor="remember">Keep me signed in</Label>
        </div>

        <FormError error={signIn.error ?? sendCode.error} />

        <Button type="submit" disabled={signIn.isPending} className="w-full">
          {signIn.isPending ? "Signing in…" : "Sign in"}
        </Button>

        <div className="flex items-center justify-between text-sm">
          <Button type="button" variant="link" size="sm" className="px-0" onClick={props.onBack}>
            Use another email
          </Button>
          <Button
            type="button"
            variant="link"
            size="sm"
            className="px-0"
            disabled={sendCode.isPending}
            onClick={onCode}
          >
            {sendCode.isPending ? "Sending…" : "Email me a code instead"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
