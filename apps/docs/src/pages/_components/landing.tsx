import { HowAbsqirWorks } from "./how-absqir-works";
import { InstallCommand } from "./install-command";
import { RotatingCode } from "./rotating-code";

/** The rest of the product, as pairs. None of these is worth a card, and a card
    grid would give eight unequal things the same weight. */
const PARTS: [string, string][] = [
  [
    "People",
    "A directory that holds someone before they have an account. Add them by hand, or import a CSV.",
  ],
  [
    "Groups",
    "A team, a division, a class, a cohort. An event expects a group, and the group is the list.",
  ],
  [
    "Schedules",
    "Every weekday at 09:00, or every Tuesday at 19:00. The rule writes its events a fortnight ahead.",
  ],
  [
    "Leave",
    "A member asks to be excused, an organizer decides, and an approval writes the record itself.",
  ],
  [
    "Reports",
    "Attendance and on-time rates by person, by group, or by event, over any range, and out as CSV.",
  ],
  ["Calendar", "A month or a week, including the events the schedules have not written yet."],
  [
    "Reminders",
    "The day before, and again within the hour, worded in each reader's own time zone.",
  ],
  ["Roles", "Owner, admin, organizer, member. One account, several organizations, a role in each."],
];

export function Landing() {
  return (
    <div className="lp">
      <section className="lp-hero">
        <div>
          <h1 className="lp-title">The code on the screen dies every 20 seconds.</h1>
          <p className="lp-lede">
            <strong>Open source attendance you run yourself.</strong> Put the QR on the projector,
            and the check-ins land while people are still sitting down.
          </p>
          <InstallCommand />
          <div className="lp-actions">
            <a className="lp-btn lp-btn-primary" href="/getting-started">
              Set up an instance
            </a>
            <a className="lp-btn" href="https://github.com/rimzzlabs/absqir">
              Source on GitHub
            </a>
          </div>
        </div>
        <RotatingCode />
      </section>

      <section className="lp-band">
        <h2 className="lp-h2">Two ways in. Neither one travels.</h2>
        <p className="lp-p">
          Whichever door somebody comes through, the clock decides present or late, and a second
          scan of the same person changes nothing and says so.
        </p>

        <div className="lp-doors">
          <div className="lp-door lp-door-main">
            <h3>The room screen</h3>
            <p className="lp-p">
              The QR carries an HMAC over the event and the current 20 second window, keyed by a
              secret that never leaves the server. The server accepts this window and the one before
              it. Only a signed-in member on the list can turn that link into a record.
            </p>
          </div>
          <div className="lp-door lp-door-alt">
            <h3>The scanner at the door</h3>
            <p className="lp-p">
              Every member carries a pass for the event, signed with the same secret and bound to
              that one person. An organizer points a phone at it, the server checks the signature,
              and the person is in. When the camera will not cooperate, the pass pastes as text.
            </p>
          </div>
        </div>
      </section>

      <section className="lp-band">
        <h2 className="lp-h2">The unglamorous half is already built.</h2>
        <p className="lp-p">
          Attendance is never only the moment of scanning. This is the rest of it.
        </p>
        <div className="lp-list">
          {PARTS.map(([key, value]) => (
            <div className="lp-list-row" key={key}>
              <div className="lp-list-key">{key}</div>
              <div className="lp-list-val">{value}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-band">
        <h2 className="lp-h2">From the list to the report.</h2>
        <p className="lp-p">
          Everyone in an event's groups is on its list. When the event closes, everyone on the list
          without a record is marked absent, so the report is complete without anybody tidying it
          up.
        </p>
        <div className="lp-figure">
          <HowAbsqirWorks />
        </div>
      </section>

      <section className="lp-close">
        <div>
          <h2 className="lp-h2">One command, and your own Postgres.</h2>
          <p className="lp-p">
            The CLI writes a compose file and a <code>.env</code> with fresh secrets. The container
            runs its migrations on start, so the schema and the code never disagree. Your data sits
            in a Docker volume you can back up. The app container holds nothing, so you can throw it
            away whenever you like.
          </p>
          <p className="lp-note">
            You need Docker and Node 22 on the machine, about a gigabyte of memory, and a Resend key
            for the sign-in codes. <a href="/getting-started">Install absqir</a> walks the whole
            way, and <a href="/first-event">Run your first event</a> picks up where it stops.
          </p>
        </div>
        <a className="lp-btn lp-btn-primary" href="/getting-started">
          Set up an instance
        </a>
      </section>
    </div>
  );
}
