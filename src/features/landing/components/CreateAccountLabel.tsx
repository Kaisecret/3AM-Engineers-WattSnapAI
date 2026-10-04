import { ArrowRight, UserRoundPlus } from "lucide-react";

/** Keep desktop account actions intact; use a compact label and arrow on phones. */
export function CreateAccountLabel({ iconSize = 20 }: { iconSize?: number }) {
  return (
    <>
      <UserRoundPlus className="landing-create-desktop" size={iconSize} aria-hidden="true" />
      <span className="landing-create-desktop">Create account</span>
      <span className="landing-create-mobile">Sign up</span>
      <ArrowRight className="landing-create-mobile" size={18} strokeWidth={2.25} aria-hidden="true" />
    </>
  );
}
