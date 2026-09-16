import type { Locale } from "@absqir/i18n";
import { useTranslate } from "@absqir/i18n/react";
import { Button } from "@absqir/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@absqir/ui/input-group";
import { MagnifyingGlassIcon, UserPlusIcon } from "@phosphor-icons/react";
import { parseAsString, useQueryState } from "nuqs";
import { useState } from "react";
import { AddMemberDialog } from "@/components/organization/add-member-dialog";
import { JoinRequestsPanel } from "@/components/organization/join-requests-panel";
import { MembersList } from "@/components/organization/members-list";
import { Providers } from "@/components/providers";
import { PageHeader } from "@/components/shared/page-header";
import type { RoleName } from "@/components/shared/role-badge";
import { SettingsSection } from "@/components/shared/settings-section";

export interface MembersPageProps {
  /** The language this reader gets, for every island under it. */
  locale: Locale;
  role: RoleName;
  currentUserId: string;
}

/** The search rides the address, so a filtered list survives a reload. */
const TEXT = parseAsString.withDefault("");

function MembersBody(props: MembersPageProps) {
  const t = useTranslate();
  const [query, setQuery] = useQueryState("q", TEXT.withOptions({ throttleMs: 300 }));
  const [adding, setAdding] = useState(false);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={t("organization:members.title")}
        description={t("organization:members.description")}
      />

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <InputGroup className="w-full sm:w-72">
            <InputGroupAddon>
              <MagnifyingGlassIcon aria-hidden />
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              aria-label={t("organization:members.search")}
              placeholder={t("organization:members.searchPlaceholder")}
              value={query}
              onChange={(event) => void setQuery(event.target.value)}
            />
          </InputGroup>

          <Button className="w-full sm:ml-auto sm:w-auto" onClick={() => setAdding(true)}>
            <UserPlusIcon />
            {t("organization:members.add")}
          </Button>
        </div>

        <MembersList role={props.role} currentUserId={props.currentUserId} query={query} />
      </div>

      {/* Whoever asks to come in is a member in waiting, so the answer sits
          on the page that holds the members rather than a page of its own. */}
      <SettingsSection
        title={t("organization:requests.title")}
        description={t("organization:requests.description")}
      >
        <div className="pt-6">
          <JoinRequestsPanel />
        </div>
      </SettingsSection>

      <AddMemberDialog open={adding} onOpenChange={setAdding} />
    </div>
  );
}

export function MembersPage(props: MembersPageProps) {
  return (
    <Providers locale={props.locale}>
      <MembersBody {...props} />
    </Providers>
  );
}
