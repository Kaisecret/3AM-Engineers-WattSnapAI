type Address = Record<string, string | undefined>;
export type LocationSuggestion = { province: string; municipality: string };
/** One deliberate user-triggered request; never called on mount or while typing. */
export async function lookupLocation(latitude: number, longitude: number, signal: AbortSignal): Promise<LocationSuggestion> {
  const query = new URLSearchParams({ format: "jsonv2", lat: latitude.toFixed(3), lon: longitude.toFixed(3), zoom: "10", addressdetails: "1", "accept-language": "en" });
  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${query}`, { signal, credentials: "omit", referrerPolicy: "origin" });
  if (!response.ok) throw new Error("The location service is unavailable. Enter your home location manually.");
  const result: { address?: Address } = await response.json();
  const address = result.address;
  if (!address || address.country_code !== "ph") throw new Error("We could not suggest a Philippine home location. Enter your location manually.");
  const known = ["Antique", "Aklan", "Capiz", "Iloilo"];
  const province = Object.values(address).find(value => known.some(name => name.toLowerCase() === value?.toLowerCase())) ?? address.province ?? address.state ?? "";
  const municipality = address.city ?? address.town ?? address.municipality ?? address.village ?? "";
  if (!province || !municipality) throw new Error("We could not identify both your province and municipality. Enter your home location manually.");
  return { province: province.slice(0, 40), municipality: municipality.slice(0, 60) };
}
