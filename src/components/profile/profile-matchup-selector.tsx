"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import ProfilePicture from "@/components/profile/profile-picture";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

type ComparisonOption = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  color: string;
  avatarUrl: string | null;
  displayName: string;
  isGuest: boolean;
};

type ProfileMatchupSelectorProps = {
  options: ComparisonOption[];
  selectedUserId: string | null;
  onSelect: (userId: string) => void;
  defaultBestFriendId: string | null;
  title?: string;
  description?: string;
  emptyLabel?: string;
};

export function ProfileMatchupSelector({
  options,
  selectedUserId,
  onSelect,
  defaultBestFriendId,
  title = "Choose a matchup",
  description = "Search recent players, friends, and guests to compare competition stats.",
  emptyLabel = "Choose a matchup",
}: ProfileMatchupSelectorProps) {
  const [open, setOpen] = useState(false);
  const selected =
    options.find((option) => option.id === selectedUserId) ?? null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="h-auto w-full justify-between rounded-xl border-border/70 bg-background/80 px-4 py-3 shadow-none hover:bg-muted/60 dark:border-white/10 dark:bg-white/6 dark:hover:bg-white/10"
        onClick={() => setOpen(true)}
      >
        <div className="flex min-w-0 items-center gap-3">
          {selected ? <ProfilePicture user={selected} size="sm" /> : null}
          <div className="min-w-0 text-left">
            <p className="truncate text-base font-semibold text-foreground dark:text-white">
              {selected
                ? `${selected.displayName}${selected.isGuest ? " (Guest)" : ""}`
                : emptyLabel}
            </p>
            <p className="text-xs font-medium text-muted-foreground dark:text-white/60">
              Search players
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {defaultBestFriendId && selectedUserId === defaultBestFriendId ? (
            <Badge
              variant="outline"
              className="rounded-full dark:border-white/10 dark:bg-white/8 dark:text-white"
            >
              Best friend
            </Badge>
          ) : null}
          <Search className="size-4 text-muted-foreground dark:text-white/60" />
        </div>
      </Button>

      <CommandDialog
        className="top-3 max-h-[calc(100dvh-1.5rem)] max-w-[calc(100%-1.5rem)] translate-y-0 sm:top-6 sm:max-w-lg"
        open={open}
        onOpenChange={setOpen}
        title={title}
        description={description}
        showCloseButton
      >
        <Command className="gap-0 bg-popover p-3 sm:p-4">
          <CommandInput className="pr-10" placeholder="Search players" />
          <CommandList className="mt-2 max-h-[min(60dvh,32rem)]">
            <CommandEmpty className="rounded-xl border border-dashed border-border/70 bg-muted/30 px-4 py-10">
              No players found.
            </CommandEmpty>
            <CommandGroup
              className="p-0 **:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:py-2 **:[[cmdk-group-heading]]:font-bold **:[[cmdk-group-heading]]:uppercase **:[[cmdk-group-heading]]:tracking-[0.16em]"
              heading="Players"
            >
              {options.map((option) => {
                const isSelected = option.id === selectedUserId;
                const label = option.isGuest
                  ? `${option.displayName} (Guest)`
                  : option.displayName;

                return (
                  <CommandItem
                    className="h-auto min-h-16 gap-3 rounded-xl px-3 py-2.5 data-selected:bg-muted/70"
                    key={option.id}
                    value={`${label} ${option.id}`}
                    data-checked={isSelected ? "true" : undefined}
                    onSelect={() => {
                      onSelect(option.id);
                      setOpen(false);
                    }}
                  >
                    <ProfilePicture user={option} size="xs" />
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <span className="truncate font-medium">{label}</span>
                      {defaultBestFriendId === option.id ? (
                        <Badge variant="outline" className="rounded-full">
                          Best friend
                        </Badge>
                      ) : null}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
