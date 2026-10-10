import { ArrowRight } from "lucide-react";

/** Shared account action label across desktop and mobile. */
export function CreateAccountLabel() {
  return (
    <>
      <span className="landing-create-label">Get started</span>
      <ArrowRight className="landing-create-arrow" size={18} strokeWidth={2.25} aria-hidden="true" />
    </>
  );
}
