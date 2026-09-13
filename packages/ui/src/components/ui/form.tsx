"use client";

import type { ReactNode } from "react";
import {
  type Control,
  Controller,
  type ControllerRenderProps,
  type FieldPath,
  type FieldValues,
  FormProvider,
  useFormContext,
} from "react-hook-form";
import { match, P } from "ts-pattern";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "#src/components/ui/field";

export { FormProvider as Form, useFormContext };

export interface FormFieldProps<TValues extends FieldValues, TName extends FieldPath<TValues>> {
  control: Control<TValues>;
  name: TName;
  label: string;
  description?: string;
  render: (field: ControllerRenderProps<TValues, TName>) => ReactNode;
}

/**
 * Binds one React Hook Form field to the Base UI Field layout. The control
 * comes from RHF and the markup from the design system, so accessibility and
 * error wiring stay in one place. Never spread register() onto an Input.
 */
export function FormField<TValues extends FieldValues, TName extends FieldPath<TValues>>(
  props: FormFieldProps<TValues, TName>,
) {
  return (
    <Controller
      control={props.control}
      name={props.name}
      render={(controller) => {
        const invalid = controller.fieldState.invalid;

        return (
          <Field data-invalid={invalid || undefined}>
            <FieldLabel htmlFor={controller.field.name}>{props.label}</FieldLabel>
            <FieldContent>
              {props.render(controller.field)}
              {match(props.description)
                .with(P.string.minLength(1), (description) => (
                  <FieldDescription>{description}</FieldDescription>
                ))
                .otherwise(() => null)}
              <FieldError errors={[controller.fieldState.error]} />
            </FieldContent>
          </Field>
        );
      }}
    />
  );
}
