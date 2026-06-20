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
        className="h-auto w-full justify-between rounded-[1.5rem] border-border/70 bg-background/80 px-4 py-3 shadow-none hover:bg-muted/60 dark:border-white/10 dark:bg-white/6 dark:hover:bg-white/10"
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
        open={open}
        onOpenChange={setOpen}
        title={title}
        description={description}
        showCloseButton
      >
        <Command className="bg-popover">
          <CommandInput placeholder="Search players" />
          <CommandList className="max-h-96">
            <CommandEmpty>No players found.</CommandEmpty>
            <CommandGroup heading="Players">
              {options.map((option) => {
                const isSelected = option.id === selectedUserId;
                const label = option.isGuest
                  ? `${option.displayName} (Guest)`
                  : option.displayName;

                return (
                  <CommandItem
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
