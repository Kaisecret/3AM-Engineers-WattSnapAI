import type { PreviewHousehold } from "@/features/dashboard/preview-data";
import { highlightPlaces, householdPlaceNames } from "../area-highlight";
import type { AdvisoryDetails } from "../types";

/** The advisory's area wording as written, with the household's own town and barangay marked. */
export default function AreaText({ details, household }: { details: Pick<AdvisoryDetails, "areaText" | "areas">; household: Pick<PreviewHousehold, "locality"> }) {
  return <>{highlightPlaces(details.areaText, householdPlaceNames(details, household)).map((part, index) => part.mine ? <mark key={index} className="adv-mine">{part.text}</mark> : part.text)}</>;
}
