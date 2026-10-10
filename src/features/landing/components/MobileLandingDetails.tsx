import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Refrigerator } from "lucide-react";
import { GlossyIcon } from "./GlossyIcon";

const features = [
  { title: "Scan Your Bill", description: "Photograph your bill and review its printed values.", icon: "camera" },
  { title: "Manage Appliances", description: "Estimate use from your own appliance details.", icon: "appliances" },
  { title: "Get Energy Tips", description: "Simple ways to save energy and money.", icon: "bulb" },
  { title: "Provider Advisories", description: "Review notices you save from your provider.", icon: "bell" },
] as const;

export function MobileLandingDetails() {
  return (
    <div className="mobile-landing-details">
      <article className="mobile-home-banner">
        <div className="mobile-home-art" aria-hidden="true">
          <Image src="/assets/branding/Cheerful Bee Robot Thumbs-Up.png" alt="" width={240} height={240} sizes="(max-width: 650px) 48vw, 1px" />
          <GlossyIcon name="bulb" />
        </div>
        <div className="mobile-home-copy">
          <h2>Smarter Homes<br /><span>Brighter Tomorrows</span></h2>
          <p>WattSnap helps you take control of your electricity usage, save money, and stay prepared.</p>
        </div>
      </article>
      <div className="mobile-features-heading">
        <span>FEATURES</span>
        <h2>Everything You Need<br />for a <strong>Smarter Home</strong></h2>
      </div>
      <div className="mobile-features-grid">
        {features.map((feature) => (
          <Link href="/dashboard" key={feature.title} className="mobile-feature-card">
            <div className={`mobile-feature-icon mobile-feature-icon-${feature.icon}`}>
              {feature.icon === "appliances" ? <Refrigerator size={35} strokeWidth={1.7} aria-hidden="true" /> : <GlossyIcon name={feature.icon} />}
            </div>
            <div><h3>{feature.title}</h3><p>{feature.description}</p></div>
            <ChevronRight size={15} aria-hidden="true" />
          </Link>
        ))}
      </div>
    </div>
  );
}
