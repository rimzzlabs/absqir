export interface FormErrorProps {
  error: Error | null | undefined;
}

/** One place for a mutation's failure message, so every form reads the same. */
export function FormError(props: FormErrorProps) {
  if (!props.error) return null;

  return (
    <p role="alert" className="text-destructive text-sm">
      {props.error.message}
    </p>
  );
}
