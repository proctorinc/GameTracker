import { useState, useEffect } from "react";
import { GetCountries, GetState, GetCity } from "react-country-state-city";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface CompleteLocation {
  country: string;
  state: string;
  city: string;
}

interface CSCItem {
  id: number;
  name: string;
}

interface ShadcnLocationSelectorProps {
  initialValue?: CompleteLocation;
  onSelect: (location: CompleteLocation) => void;
}

export default function ShadcnLocationSelector({
  initialValue,
  onSelect,
}: ShadcnLocationSelectorProps) {
  const DEFAULT_COUNTRY_ID = "233"; // United States ID token

  const [countriesList, setCountriesList] = useState<CSCItem[]>([]);
  const [statesList, setStatesList] = useState<CSCItem[]>([]);
  const [citiesList, setCitiesList] = useState<CSCItem[]>([]);

  // Initialize directly to default country ID string 
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(DEFAULT_COUNTRY_ID);
  const [selectedStateId, setSelectedStateId] = useState<string | null>(null);

  const [locationStrings, setLocationStrings] = useState<CompleteLocation>({
    country: initialValue?.country || "",
    state: initialValue?.state || "",
    city: initialValue?.city || "",
  });

  // 1. Initial Load: Fetch all countries & establish string name for fallback
  useEffect(() => {
    GetCountries().then((result: CSCItem[]) => {
      setCountriesList(result);
      
      // If parent gave a specific string, try matching its explicit ID
      if (initialValue?.country) {
        const foundCountry = result.find(
          (c) => c.name.toLowerCase() === initialValue.country.toLowerCase()
        );
        if (foundCountry) {
          setSelectedCountryId(String(foundCountry.id));
          setLocationStrings((prev) => ({ ...prev, country: foundCountry.name }));
          return;
        }
      }

      // Fallback: Bind the literal string title of country 233 to state
      const defaultCountry = result.find((c) => String(c.id) === DEFAULT_COUNTRY_ID);
      if (defaultCountry && !locationStrings.country) {
        setLocationStrings((prev) => ({ ...prev, country: defaultCountry.name }));
      }
    });
  }, [initialValue?.country]);

  // 2. Cascading Load: Fetch states when country ID updates
  useEffect(() => {
    if (selectedCountryId) {
      GetState(Number(selectedCountryId)).then((result: CSCItem[]) => {
        setStatesList(result);
        
        if (initialValue?.state) {
          const foundState = result.find(
            (s) => s.name.toLowerCase() === initialValue.state.toLowerCase()
          );
          if (foundState) {
            setSelectedStateId(String(foundState.id));
          }
        }
      });
    } else {
      setStatesList([]);
      setSelectedStateId("");
    }
  }, [selectedCountryId, initialValue?.state]);

  // 3. Cascading Load: Fetch cities when state ID updates
  useEffect(() => {
    if (selectedCountryId && selectedStateId) {
      GetCity(Number(selectedCountryId), Number(selectedStateId)).then((result: CSCItem[]) => {
        setCitiesList(result);
      });
    } else {
      setCitiesList([]);
    }
  }, [selectedCountryId, selectedStateId]);

  // Handlers for Selection Changes
  const handleCountryChange = (idString: string | null) => {
    if (!idString) {
      return;
    }

    const found = countriesList.find((c) => String(c.id) === idString);
    const name = found ? found.name : "";

    setSelectedCountryId(idString);
    setSelectedStateId(""); 
    setCitiesList([]);

    const updated = { country: name, state: "", city: "" };
    setLocationStrings(updated);
    onSelect(updated);
  };

  const handleStateChange = (idString: string | null) => {
    const found = statesList.find((s) => String(s.id) === idString);
    const name = found ? found.name : "";

    setSelectedStateId(idString);

    const updated = { ...locationStrings, state: name, city: "" };
    setLocationStrings(updated);
    onSelect(updated);
  };

  const handleCityChange = (cityName: string | null) => {
    if (!cityName) {
      return;
    }

    const updated = { ...locationStrings, city: cityName };
    setLocationStrings(updated);
    onSelect(updated);
  };

  return (
    <div className="space-y-4 w-full">
      {/* Country Select */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-muted-foreground">Country</label>
        <Select value={selectedCountryId} onValueChange={handleCountryChange}>
          <SelectTrigger className="w-full">
            <SelectValue>
              {selectedCountryId === "233" && !locationStrings.country 
                ? "United States" 
                : (locationStrings.country || "Select Country")}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {countriesList.map((country) => (
              <SelectItem key={country.id} value={String(country.id)}>
                {country.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* State Select */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-muted-foreground">State / Province</label>
        <Select 
          value={selectedStateId} 
          onValueChange={handleStateChange}
          disabled={!selectedCountryId || statesList.length === 0}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select State" />
          </SelectTrigger>
          <SelectContent>
            {statesList.map((state) => (
              <SelectItem key={state.id} value={String(state.id)}>
                {state.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* City Select */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-muted-foreground">City</label>
        <Select 
          value={locationStrings.city} 
          onValueChange={handleCityChange}
          disabled={!selectedStateId || citiesList.length === 0}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select City" />
          </SelectTrigger>
          <SelectContent>
            {citiesList.map((city) => (
              <SelectItem key={city.id} value={city.name}>
                {city.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
