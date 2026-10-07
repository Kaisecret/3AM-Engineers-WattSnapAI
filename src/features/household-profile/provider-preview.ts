/** UI choices only. These province labels are not verified service boundaries. */
export const previewProviders = [
  { id: "anteco", name: "ANTECO", area: "Antique", detail: "Antique Electric Cooperative" },
  { id: "akelco", name: "AKELCO", area: "Aklan", detail: "Aklan Electric Cooperative" },
  { id: "capelco", name: "CAPELCO", area: "Capiz", detail: "Capiz Electric Cooperative" },
  { id: "ileco-1", name: "ILECO I", area: "Iloilo", detail: "Iloilo I Electric Cooperative" },
  { id: "ileco-2", name: "ILECO II", area: "Iloilo", detail: "Iloilo II Electric Cooperative" },
  { id: "ileco-3", name: "ILECO III", area: "Iloilo", detail: "Iloilo III Electric Cooperative" },
  { id: "more-power", name: "MORE Power", area: "Iloilo", detail: "Distribution utility" },
] as const;

export function previewProviderName(id?: string) {
  return previewProviders.find(provider => provider.id === id)?.name ?? "Not selected";
}
