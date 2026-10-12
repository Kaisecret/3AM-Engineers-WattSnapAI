"use client";
import { Check, Lightbulb } from "lucide-react";
import { useSetupProgress } from "../use-setup-progress";
import "../setup.css";

export default function TipsSetupReview() {
  const progress = useSetupProgress();
  if (!progress.ready) return null;
  if (progress.steps[4].complete) return <p className="setup-tips-done"><Check size={16} aria-hidden="true" />Tips reviewed</p>;
  return <section className="setup-tips-review" aria-labelledby="setup-tips-title"><Lightbulb aria-hidden="true" /><div><h2 id="setup-tips-title">{progress.canReviewTips ? "Finish your tips review" : "Finish home setup"}</h2><p>{progress.canReviewTips ? "Read your tips, then mark this step done." : "Add a bill and an appliance. Your tips update for you to review."}</p>{progress.canReviewTips && <button type="button" className="ui-primary" onClick={progress.reviewTips}><Check size={18} aria-hidden="true" />I’ve reviewed these tips</button>}{progress.progressError && <p role="alert" className="ui-error">{progress.progressError}</p>}</div></section>;
}
