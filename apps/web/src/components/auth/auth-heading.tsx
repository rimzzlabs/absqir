export interface AuthHeadingProps {
  title: string;
  description: string;
}

export function AuthHeading(props: AuthHeadingProps) {
  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold tracking-tight">{props.title}</h1>
      <p className="text-muted-foreground mt-1 text-sm">{props.description}</p>
    </div>
  );
}
