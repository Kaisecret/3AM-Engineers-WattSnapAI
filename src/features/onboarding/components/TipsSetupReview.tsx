"use client";
import Link from "next/link";
import { Check, Lightbulb } from "lucide-react";
import { useSetupProgress } from "../use-setup-progress";
import "../setup.css";

export default function TipsSetupReview() {
  const progress = useSetupProgress();
  if (!progress.ready) return null;
  return <section className="ui-panel setup-tips-review" aria-labelledby="setup-tips-title"><Lightbulb aria-hidden="true" /><div><h2 id="setup-tips-title">Explore your personalized tips</h2><p>{progress.steps[4].complete ? "Your review is saved. You can revisit these ideas anytime." : progress.canReviewTips ? "Read the tips, their input basis, and their assumptions. Confirm your review to finish this setup step." : "Save your own bill and appliance, then create current household tips. Sample or earlier-input tips cannot finish this step."}</p>{progress.canReviewTips && !progress.steps[4].complete && <button type="button" className="ui-primary" onClick={progress.reviewTips}><Check size={18} aria-hidden="true" />I’ve reviewed these tips</button>}<Link href="/setup">Back to your setup checklist</Link>{progress.error && <p role="alert" className="ui-error">{progress.error}</p>}</div></section>;
}
