import { ArrowRight, FileSearch, ScanLine } from "lucide-react";
import { GlossyIcon } from "./GlossyIcon";

const steps = [
  { title: "Scan Your Bill", description: "Take a photo of your electricity bill.", color: "blue" },
  { title: "Review the Details", description: "Enter the printed values and confirm them before saving.", color: "green" },
  { title: "View Insights", description: "See your consumption, bill history, and trends.", color: "orange" },
  { title: "Take Action", description: "Get tips and prepare for advisories to save energy and money.", color: "purple" },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="post-workflow">
      <div className="post-container">
        <h2 className="post-heading">How <span className="post-blue-text">WattSnap</span> <span className="post-orange-text">Works</span><span className="post-heading-spark" aria-hidden="true">✦</span></h2>
        <ol className="post-steps">
          {steps.map((step, index) => (
            <li key={step.title} className="post-step">
              <span className={`post-step-number post-number-${step.color}`}>{index + 1}</span>
              <div className={`post-step-icon post-step-icon-${step.color}`}>
                {index === 0 ? <ScanLine size={62} strokeWidth={1.8} aria-hidden="true" /> : index === 1 ? <FileSearch size={62} strokeWidth={1.8} aria-hidden="true" /> : <GlossyIcon name={index === 2 ? "chart" : "bulb"} />}
              </div>
              <h3>{step.title}</h3><p>{step.description}</p>
              {index < steps.length - 1 && <ArrowRight className="post-step-arrow" size={27} aria-hidden="true" />}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}