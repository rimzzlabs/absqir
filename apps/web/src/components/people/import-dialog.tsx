import { Alert, AlertDescription, AlertTitle } from "@absqir/ui/alert";
import { Button } from "@absqir/ui/button";
import { Checkbox } from "@absqir/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@absqir/ui/dialog";
import { Field, FieldContent, FieldLabel } from "@absqir/ui/field";
import { Form, FormField } from "@absqir/ui/form";
import { Label } from "@absqir/ui/label";
import { Textarea } from "@absqir/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { A } from "@mobily/ts-belt";
import { UploadSimpleIcon } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
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
      {result.skipped.length > 0 ? (
        <AlertDescription>
          <p>{result.skipped.length} row(s) skipped:</p>
          <ul className="list-disc pl-5">
            {A.map(result.skipped.slice(0, 10), (row) => (
              <li key={row.row}>
                Row {row.row}: {row.reason}
              </li>
            ))}
            {result.skipped.length > 10 ? <li>and {result.skipped.length - 10} more</li> : null}
          </ul>
        </AlertDescription>
      ) : null}
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
    <Dialog open={props.open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import people from CSV</DialogTitle>
          <DialogDescription>
            The first row names the columns: <code>name</code> is required, <code>email</code> and{" "}
            <code>identifier</code> are optional. A row that matches an existing email or identifier
            updates that person. Up to 1000 rows per import.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <>
            <Summary result={result} />
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((values) =>
                importPeople.mutate(values, { onSuccess: setResult }),
              )}
              className="space-y-4"
              noValidate
            >
              <input
                ref={fileInput}
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(event) => void onFile(event.target.files?.[0])}
              />
              <Button type="button" variant="outline" onClick={() => fileInput.current?.click()}>
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

              {invite ? (
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
              ) : null}

              <FormError error={importPeople.error} />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={importPeople.isPending}>
                  {importPeople.isPending ? "Importing…" : "Import"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
