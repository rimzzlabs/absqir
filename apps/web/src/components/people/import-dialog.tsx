import { Alert, AlertDescription, AlertTitle } from "@absqir/ui/alert";
import { Button } from "@absqir/ui/button";
import { Checkbox } from "@absqir/ui/checkbox";
import { Field, FieldContent, FieldLabel } from "@absqir/ui/field";
import { Form, FormField } from "@absqir/ui/form";
import { Label } from "@absqir/ui/label";
import {
  ResponsiveDialog,
  ResponsiveDialogBody,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@absqir/ui/responsive-dialog";
import { Textarea } from "@absqir/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { A } from "@mobily/ts-belt";
import { UploadSimpleIcon } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { match, P } from "ts-pattern";
import { FormError } from "@/components/shared/form-error";
import { RoleSelect } from "@/components/shared/role-select";
import { type ImportValues, importSchema } from "@/lib/directory-schemas";
import { type ImportResult, useImportPeople } from "@/mutations/use-import-people";

export interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EXAMPLE =
  "name,email,identifier\nAda Lovelace,ada@example.com,EMP-001\nGrace Hopper,,EMP-002";

function Summary(props: { result: ImportResult }) {
  const { result } = props;

  return (
    <Alert>
      <AlertTitle>
        {result.created} added, {result.updated} updated, {result.invited} invited
      </AlertTitle>
      {match(result.skipped.length > 0)
        .with(true, () => (
          <AlertDescription>
            <p>{result.skipped.length} row(s) skipped:</p>
            <ul className="list-disc pl-5">
              {A.map(result.skipped.slice(0, 10), (row) => (
                <li key={row.row}>
                  Row {row.row}: {row.reason}
                </li>
              ))}
              {match(result.skipped.length > 10)
                .with(true, () => <li>and {result.skipped.length - 10} more</li>)
                .otherwise(() => null)}
            </ul>
          </AlertDescription>
        ))
        .otherwise(() => null)}
    </Alert>
  );
}

export function ImportDialog(props: ImportDialogProps) {
  const form = useForm<ImportValues>({
    resolver: zodResolver(importSchema),
    defaultValues: { csv: "", invite: false, role: "member" },
  });
  const fileInput = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const importPeople = useImportPeople();
  const invite = form.watch("invite");

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    form.setValue("csv", await file.text(), { shouldValidate: true });
  };

  const onOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
      setResult(null);
    }
    props.onOpenChange(open);
  };

  return (
    <ResponsiveDialog open={props.open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-lg">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Import people from CSV</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            The first row names the columns: <code>name</code> is required, <code>email</code> and{" "}
            <code>identifier</code> are optional. A row that matches an existing email or identifier
            updates that person. Up to 1000 rows per import.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        {match(result)
          .with(P.nullish, () => (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((values) =>
                  importPeople.mutate(values, { onSuccess: setResult }),
                )}
                className="flex min-h-0 flex-1 flex-col gap-4"
                noValidate
              >
                <ResponsiveDialogBody>
                  <input
                    ref={fileInput}
                    type="file"
                    accept=".csv,text/csv"
                    className="sr-only"
                    onChange={(event) => void onFile(event.target.files?.[0])}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInput.current?.click()}
                  >
                    <UploadSimpleIcon />
                    Choose a CSV file
                  </Button>

                  <FormField
                    control={form.control}
                    name="csv"
                    label="Or paste the rows"
                    render={(field) => (
                      <Textarea
                        {...field}
                        id="import-csv"
                        rows={8}
                        placeholder={EXAMPLE}
                        className="font-mono text-xs"
                      />
                    )}
                  />

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="import-invite"
                      checked={invite}
                      onCheckedChange={(checked) => form.setValue("invite", checked === true)}
                    />
                    <Label htmlFor="import-invite">Invite every row that has an email</Label>
                  </div>

                  {match(invite)
                    .with(true, () => (
                      <Field>
                        <FieldLabel htmlFor="import-role">Role for the invitations</FieldLabel>
                        <FieldContent>
                          <RoleSelect
                            id="import-role"
                            value={form.watch("role")}
                            onChange={(value) => form.setValue("role", value)}
                          />
                        </FieldContent>
                      </Field>
                    ))
                    .otherwise(() => null)}

                  <FormError error={importPeople.error} />
                </ResponsiveDialogBody>
                <ResponsiveDialogFooter>
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={importPeople.isPending}>
                    {match(importPeople.isPending)
                      .with(true, () => "Importing…" as const)
                      .otherwise(() => "Import" as const)}
                  </Button>
                </ResponsiveDialogFooter>
              </form>
            </Form>
          ))
          .otherwise((result) => (
            <>
              <ResponsiveDialogBody>
                <Summary result={result} />
              </ResponsiveDialogBody>
              <ResponsiveDialogFooter>
                <Button onClick={() => onOpenChange(false)}>Done</Button>
              </ResponsiveDialogFooter>
            </>
          ))}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
