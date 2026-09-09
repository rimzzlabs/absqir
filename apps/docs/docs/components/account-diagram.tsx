import { Arrow, Diagram, Node } from "./diagram";

export function OneDoor() {
  return (
    <Diagram
      title="One sign-in page, and the three ways it answers an email address"
      viewBox="0 0 900 290"
      minWidth={720}
      caption="An email may register when an organizer invited it, when it arrived from an event's public page, when REGISTRATION_OPEN is true, or when the instance has no account yet."
    >
      <Node
        x={16}
        y={110}
        width={160}
        height={70}
        label="Sign-in page"
        sub={["asks for an", "email address"]}
      />
      <Node
        x={220}
        y={110}
        width={170}
        height={70}
        label="Look it up"
        sub={["known? may it", "register?"]}
        tone="accent"
      />

      <Node
        x={500}
        y={20}
        width={384}
        height={66}
        label="Known"
        sub={["the password, or a 6 digit code instead"]}
      />
      <Node
        x={500}
        y={112}
        width={384}
        height={66}
        label="Unknown, may register"
        sub={["a code creates the account, then onboarding"]}
      />
      <Node
        x={500}
        y={204}
        width={384}
        height={66}
        label="Unknown, may not register"
        sub={["it needs an invitation first"]}
        tone="muted"
      />

      <Arrow from={[176, 145]} to={[216, 145]} />
      <Arrow from={[392, 128]} to={[496, 57]} />
      <Arrow from={[392, 145]} to={[496, 145]} />
      <Arrow from={[392, 162]} to={[496, 233]} />
    </Diagram>
  );
}
