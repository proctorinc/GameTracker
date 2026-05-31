"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface SearchableSelectOption {
  value: string;
  label: string;
  keywords?: string[];
}

interface SearchableSelectProps<TOption extends SearchableSelectOption> {
  value: string | null;
  options: TOption[];
  onValueChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder: string;
  emptyMessage: string;
  disabled?: boolean;
  className?: string;
  includeValueInSearch?: boolean;
  renderOption?: (option: TOption) => ReactNode;
  renderSelectedValue?: (option: TOption) => ReactNode;
}

export function SearchableSelect<TOption extends SearchableSelectOption>({
  value,
  options,
  onValueChange,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  disabled = false,
  className,
  includeValueInSearch = true,
  renderOption,
  renderSelectedValue,
}: SearchableSelectProps<TOption>) {
  const [open, setOpen] = useState(false);

  const selectedOption =
    options.find((option) => option.value === value) ?? null;
  const normalizedOptions = useMemo(
    () =>
      options.map((option) => ({
        ...option,
        searchValue: [
          option.label,
          ...(includeValueInSearch ? [option.value] : []),
          ...(option.keywords ?? []),
        ].join(" "),
      })),
    [includeValueInSearch, options],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            role="combobox"
            className={cn(
              "w-full justify-between rounded-lg border-input bg-transparent px-3 py-2 font-normal shadow-none",
              !selectedOption && "text-muted-foreground",
              className,
            )}
          />
        }
        aria-expanded={open}
        disabled={disabled}
      >
        <span className="min-w-0 flex-1 truncate">
          {selectedOption
            ? (renderSelectedValue?.(selectedOption) ?? selectedOption.label)
            : placeholder}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-(--anchor-width) p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {normalizedOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.searchValue}
                  onSelect={() => {
                    onValueChange(option.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "size-4",
                      value === option.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {renderOption?.(option) ?? option.label}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
