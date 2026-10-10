import AppliancesScreen from "@/features/dashboard/components/AppliancesScreen";
import "@/features/dashboard/appliances.css";

// Links that say "Add an appliance" open the list with the Add popup already showing.
export default function Page() { return <AppliancesScreen startAdding />; }
