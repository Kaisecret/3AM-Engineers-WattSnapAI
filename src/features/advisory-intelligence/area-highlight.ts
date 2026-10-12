import type { PreviewHousehold } from "../dashboard/preview-data";
import type { AdvisoryDetails } from "./types";

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const same = (a: string, b: string) => a.trim().toLocaleLowerCase("en-PH").replace(/\s+/g, " ") === b.trim().toLocaleLowerCase("en-PH").replace(/\s+/g, " ");
/** Whole names only: "Hamtic" is not found inside "Hamtican". */
const pattern = (names: string[], flags: string) => new RegExp(`(?<![\\p{L}\\p{N}])(?:${names.map(escape).join("|")})(?![\\p{L}\\p{N}])`, flags);

/**
 * The household's own town and barangay as the advisory's area wording writes them, longest first.
 * Display only: whether the household is listed is decided by `matchPreviewAdvisory`.
 */
export function householdPlaceNames(details: Pick<AdvisoryDetails, "areaText" | "areas">, household: Pick<PreviewHousehold, "locality">): string[] {
  const town = household.locality?.municipality.trim() ?? "", barangay = household.locality?.barangay.trim() ?? "";
  const written = (name: string) => name.length >= 3 && pattern([name], "iu").test(details.areaText);
  const names: string[] = [];
  if (!town) return names;
  if (written(town)) names.push(town);
  else if (details.areas.some(area => same(area.municipality, town))) {
    // A post may shorten a long town name, as in "San Jose" for San Jose de Buenavista.
    const words = town.split(/\s+/);
    for (let count = words.length - 1; count >= 2; count -= 1) { const short = words.slice(0, count).join(" "); if (written(short)) { names.push(short); break; } }
  }
  // Barangay names repeat across towns, so one is the household's only beside its town.
  if (names.length && written(barangay)) names.push(barangay);
  return names.sort((a, b) => b.length - a.length);
}

/** The wording split into plain pieces and the household's own names. Joined, the pieces are the wording unchanged. */
export function highlightPlaces(text: string, names: string[]): { text: string; mine: boolean }[] {
  if (!names.length) return [{ text, mine: false }];
  const parts: { text: string; mine: boolean }[] = [];
  let from = 0;
  for (const match of text.matchAll(pattern(names, "giu"))) {
    if (match.index > from) parts.push({ text: text.slice(from, match.index), mine: false });
    parts.push({ text: match[0], mine: true });
    from = match.index + match[0].length;
  }
  if (from < text.length) parts.push({ text: text.slice(from), mine: false });
  return parts;
}
