import { daysUntil } from "@absqir/core/date";
import { canGrantOwner, canManageAccess } from "@absqir/core/member-access";
import type { Translate } from "@absqir/i18n";
import { useTranslate } from "@absqir/i18n/react";
import { Avatar, AvatarFallback, AvatarImage } from "@absqir/ui/avatar";
import { Badge } from "@absqir/ui/badge";
import { type DataColumn, DataTable } from "@absqir/ui/data-table";
import { Skeleton } from "@absqir/ui/skeleton";
import { A } from "@mobily/ts-belt";
import { EnvelopeSimpleIcon } from "@phosphor-icons/react";
import { match, P } from "ts-pattern";
import {
  asRole,
  IdentifierCell,
  InvitationActions,
  MemberCardActions,
  RemoveAction,
  RoleCell,
} from "@/components/organization/member-actions";
import { QueryError } from "@/components/shared/query-error";
import { RoleBadge, type RoleName } from "@/components/shared/role-badge";
import { initialsOf } from "@/lib/avatar";
import { type Invitation, type Member, useInvitations, useMembers } from "@/queries/use-members";
import { type Person, usePeople } from "@/queries/use-people";

export interface MembersListProps {
  role: RoleName;
  currentUserId: string;
  /** What the reader typed in the toolbar. An empty string keeps every row. */
  query: string;
}

/**
 * One list, two kinds of row. A person who has joined and a person who still
 * holds an invitation both belong to the organization in the reader's mind,
 * so both sit in the same list under the same toolbar.
 */
type DirectoryRow =
  | { kind: "member"; key: string; name: string; email: string; member: Member }
  | { kind: "invitation"; key: string; name: string; email: string; invitation: Invitation };

function rowsOf(members: readonly Member[], invitations: readonly Invitation[]): DirectoryRow[] {
  return [
    ...A.map(
      members,
      (member): DirectoryRow => ({
        kind: "member",
        key: `member:${member.id}`,
        name: member.user.name,
        email: member.user.email,
        member,
      }),
    ),
    ...A.map(
      invitations,
      (invitation): DirectoryRow => ({
        kind: "invitation",
        key: `invitation:${invitation.id}`,
        // An invitation knows nothing but the address it went to.
        name: invitation.email,
        email: invitation.email,
        invitation,
      }),
    ),
  ];
}

function matches(row: DirectoryRow, needle: string): boolean {
  return row.name.toLowerCase().includes(needle) || row.email.toLowerCase().includes(needle);
}

/** "3 days left", or "Last day" on the final one. */
function expiryLabel(t: Translate, invitation: Invitation): string {
  const days = daysUntil(new Date(invitation.expiresAt));

  return match(days)
    .with(P.number.lte(0), () => t("organization:members.expiresToday"))
    .otherwise((days) => t("organization:members.expiresIn", { count: days }));
}

function MemberIdentity(props: { member: Member; isSelf: boolean }) {
  const { member } = props;
  const t = useTranslate();

  return (
    <div className="flex items-center gap-3">
      <Avatar>
        {match(member.user.image)
          .with(P.string.minLength(1), (image) => <AvatarImage src={image} alt="" />)
          .otherwise(() => null)}
        <AvatarFallback name={member.user.name}>{initialsOf(member.user.name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate font-medium">
          {member.user.name}
          {match(props.isSelf)
            .with(true, () => (
              <span className="text-muted-foreground">{t("organization:members.you")}</span>
            ))
            .otherwise(() => null)}
        </p>
        <p className="text-muted-foreground truncate text-xs">{member.user.email}</p>
      </div>
    </div>
  );
}

/** An invitation has an address and nothing else, so the envelope stands in. */
function InvitationIdentity(props: { invitation: Invitation }) {
  const t = useTranslate();

  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden
        className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-full"
      >
        <EnvelopeSimpleIcon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="truncate font-medium">{props.invitation.email}</p>
        <p className="text-muted-foreground truncate text-xs">
          {t("organization:members.invitedHint")}
        </p>
      </div>
    </div>
  );
}

function StatusCell(props: { row: DirectoryRow }) {
  const t = useTranslate();

  return match(props.row)
    .with({ kind: "member" }, () => (
      <Badge variant="secondary">{t("organization:members.joined")}</Badge>
    ))
    .otherwise(({ invitation }) => (
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{t("organization:members.invited")}</Badge>
        <span className="text-muted-foreground text-xs tabular-nums">
          {expiryLabel(t, invitation)}
        </span>
      </div>
    ));
}

export function MembersList(props: MembersListProps) {
  const t = useTranslate();
  const members = useMembers();
  const invitations = useInvitations();
  const people = usePeople();
  const grantsOwner = canGrantOwner(props.role);

  // Every member is also a person. The directory row carries the identifier.
  const directory = new Map(
    A.flatMap(people.data ?? [], (person) =>
      match(person.userId)
        .with(P.string, (userId) => [[userId, person] as const])
        .otherwise(() => []),
    ),
  );

  const isSelf = (member: Member) => member.userId === props.currentUserId;
  const canChange = (member: Member) =>
    canManageAccess(props.role, { role: asRole(member.role), isSelf: isSelf(member) });
  const personFor = (member: Member): Person | undefined => directory.get(member.userId);

  const columns: DataColumn<DirectoryRow>[] = [
    {
      key: "person",
      header: t("organization:members.person"),
      place: "primary",
      cell: (row) =>
        match(row)
          .with({ kind: "member" }, ({ member }) => (
            <MemberIdentity member={member} isSelf={isSelf(member)} />
          ))
          .otherwise(({ invitation }) => <InvitationIdentity invitation={invitation} />),
    },
    {
      // The card carries this in the popover instead, where there is room.
      key: "identifier",
      header: t("organization:members.identifier"),
      place: "none",
      cell: (row) =>
        match(row)
          .with({ kind: "member" }, ({ member }) =>
            match(personFor(member))
              .with(P.nullish, () => <span className="text-muted-foreground">—</span>)
              .otherwise((person) => <IdentifierCell person={person} name={member.user.name} />),
          )
          .otherwise(() => <span className="text-muted-foreground">—</span>),
    },
    {
      key: "role",
      header: t("organization:members.role"),
      cell: (row) =>
        match(row)
          .with({ kind: "member" }, ({ member }) => (
            <RoleCell member={member} canChange={canChange(member)} canGrantOwner={grantsOwner} />
          ))
          .otherwise(({ invitation }) => <RoleBadge role={asRole(invitation.role)} />),
      // A card states the role and holds the select in the popover, so the
      // three controls of a row arrive from one corner instead of three.
      card: (row) =>
        match(row)
          .with({ kind: "member" }, ({ member }) => <RoleBadge role={asRole(member.role)} />)
          .otherwise(({ invitation }) => <RoleBadge role={asRole(invitation.role)} />),
    },
    {
      key: "status",
      header: t("organization:members.status"),
      cell: (row) => <StatusCell row={row} />,
    },
    {
      key: "actions",
      place: "action",
      headClassName: "w-16",
      cellClassName: "text-right",
      cell: (row) =>
        match(row)
          .with({ kind: "member" }, ({ member }) =>
            match(canChange(member))
              .with(true, () => <RemoveAction member={member} />)
              .otherwise(() => null),
          )
          .otherwise(({ invitation }) => <InvitationActions invitation={invitation} />),
      card: (row) =>
        match(row)
          .with({ kind: "member" }, ({ member }) => (
            <MemberCardActions
              member={member}
              person={personFor(member)}
              canChange={canChange(member)}
              canGrantOwner={grantsOwner}
            />
          ))
          .otherwise(({ invitation }) => <InvitationActions invitation={invitation} />),
    },
  ];

  const pending = members.isPending || invitations.isPending;
  const needle = props.query.trim().toLowerCase();
  const rows = A.filter(
    rowsOf(members.data ?? [], invitations.data ?? []),
    (row) => needle === "" || matches(row, needle),
  );

  return match({ pending, members, invitations, count: rows.length })
    .with({ pending: true }, () => <Skeleton className="h-48 rounded-xl" />)
    .with({ members: { isError: true } }, () => <QueryError query={members} />)
    .with({ invitations: { isError: true } }, () => <QueryError query={invitations} />)
    .with({ count: 0 }, () => (
      <p className="text-muted-foreground py-8 text-center text-sm">
        {t("organization:members.noMatch")}
      </p>
    ))
    .otherwise(() => (
      <DataTable
        label={t("organization:members.listLabel")}
        columns={columns}
        rows={rows}
        getKey={(row) => row.key}
      />
    ));
}
