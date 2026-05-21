import { useState, useEffect, useMemo } from "react";
import { GetState, GetCity } from "react-country-state-city";
import { Check, ChevronsUpDown, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button"; // Adjust path to your Shadcn buttons
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

export interface CompleteLocation {
  country: string;
  state: string;
  city: string;
}

interface USLocationSelectorProps {
  initialValue?: CompleteLocation;
  onSelect: (location: CompleteLocation) => void;
}

interface FlatCityItem {
  id: string;
  cityName: string;
  stateName: string;
  searchLabel: string;
}

export default function LocationAutocompleteSelector({
  initialValue,
  onSelect,
}: USLocationSelectorProps) {
  const US_COUNTRY_ID = 233;

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Entire flattened list of US cities stored cleanly in memory
  const [flatCities, setFlatCities] = useState<FlatCityItem[]>([]);
  
  const [selectedLocation, setSelectedLocation] = useState<CompleteLocation>({
    country: "United States",
    state: initialValue?.state || "",
    city: initialValue?.city || "",
  });

  // 1. Core Data Ingestion: Fetch states, then iteratively fetch all cities inside those states
  useEffect(() => {
    async function loadAllUSLocations() {
      try {
        setLoading(true);
        const states = await GetState(US_COUNTRY_ID);
        
        // Fetch all city arrays concurrently across all states
        const cityPromises = states.map(async (state: { id: number; name: string }) => {
          const cities = await GetCity(US_COUNTRY_ID, state.id);
          return cities.map((city: { id: number; name: string }) => ({
            id: `${state.id}-${city.id}`,
            cityName: city.name,
            stateName: state.name,
            searchLabel: `${city.name}, ${state.name}`,
          }));
        });

        const resolvedArrays = await Promise.all(cityPromises);
        const flattened = resolvedArrays.flat();
        
        setFlatCities(flattened);
      } catch (error) {
        console.error("Failed to load geographic dataset", error);
      } finally {
        setLoading(false);
      }
    }

    loadAllUSLocations();
  }, []);

  // 2. Performance Filter: Don't render 19,000 DOM elements. 
  // Only calculate suggestions matching the first few keystrokes.
  const filteredSuggestions = useMemo(() => {
    const cleanQuery = searchQuery.trim().toLowerCase();
    if (cleanQuery.length < 2) return []; // Require at least 2 letters before offering choices

    return flatCities
      .filter((item) => item.searchLabel.toLowerCase().includes(cleanQuery))
      .slice(0, 50); // Hard ceiling at 50 results to keep layout rendering instant
  }, [searchQuery, flatCities]);

  const handleSelectSuggestion = (item: FlatCityItem) => {
    const updated: CompleteLocation = {
      country: "United States",
      state: item.stateName,
      city: item.cityName,
    };
    setSelectedLocation(updated);
    onSelect(updated);
    setOpen(false);
  };

  const currentDisplayValue =
    selectedLocation.city && selectedLocation.state
      ? `${selectedLocation.city}, ${selectedLocation.state}`
      : "";

  return (
    <div className="space-y-1.5 w-full max-w-sm">
      <label className="text-sm font-medium text-muted-foreground">Location (US Only)</label>
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={loading}
            className="w-full justify-between font-normal text-left"
          >
            {loading ? (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading index data...
              </span>
            ) : currentDisplayValue ? (
              <span className="text-foreground font-medium">{currentDisplayValue}</span>
            ) : (
              <span className="text-muted-foreground">Type to search city, state...</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command shouldFilter={false}> {/* Bypass internal client sorting since we use our useMemo filter */}
            <div className="flex items-center border-b px-3" cmpt-input-wrapper="">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                placeholder="Search e.g. Portland, Oregon"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            
            <CommandList>
              {searchQuery.trim().length < 2 && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Type at least 2 characters to search...
                </div>
              )}
              
              {searchQuery.trim().length >= 2 && filteredSuggestions.length === 0 && (
                <CommandEmpty>No locations match your search query.</CommandEmpty>
              )}

              <CommandGroup>
                {filteredSuggestions.map((item) => {
                  const isSelected =
                    selectedLocation.city === item.cityName &&
                    selectedLocation.state === item.stateName;

                  return (
                    <CommandItem
                      key={item.id}
                      value={item.searchLabel}
                      onSelect={() => handleSelectSuggestion(item)}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          isSelected ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {item.searchLabel}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}