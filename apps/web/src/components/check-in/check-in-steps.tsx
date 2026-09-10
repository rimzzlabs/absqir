import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@absqir/ui/card";
import { A } from "@mobily/ts-belt";
import { ListNumbersIcon } from "@phosphor-icons/react";

const STEPS = [
  {
    title: "Point at the room screen",
    hint: "The organizer puts a code on a screen or a printout. Hold it inside the frame.",
  },
  {
    title: "Or show your pass",
    hint: "No screen in the room? Open your pass and let the organizer scan you.",
  },
  {
    title: "Your record is written",
    hint: "You see the time and the status at once. It lands in your history too.",
  },
];

/** Three lines that answer the first-timer, and fill the rail with sense. */
export function CheckInSteps() {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListNumbersIcon />
          How it works
        </CardTitle>
        <CardDescription>Two ways in. Both write the same record.</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="flex flex-col gap-3">
          {A.mapWithIndex(STEPS, (index, step) => (
            <li key={step.title} className="flex gap-3">
              <span
                aria-hidden
                className="bg-muted text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium tabular-nums"
              >
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm leading-snug font-medium">{step.title}</p>
                <p className="text-muted-foreground mt-0.5 text-xs">{step.hint}</p>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
