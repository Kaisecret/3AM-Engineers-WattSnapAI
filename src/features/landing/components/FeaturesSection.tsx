import Image from "next/image";
import { ChevronRight, FileText } from "lucide-react";
import { GlossyIcon, type GlossyIconName } from "./GlossyIcon";
import { MobileLandingDetails } from "./MobileLandingDetails";

const features: { title: string; description: string; icon: GlossyIconName | "bill"; color: string }[] = [
  { title: "Scan Your Electricity Bill", description: "Take a clear photo and let AI extract the important details for you to review.", icon: "bill", color: "blue" },
  { title: "Track Your Consumption", description: "View confirmed monthly usage and consumption trends in easy-to-read charts.", icon: "chart", color: "green" },
  { title: "Get Energy-Saving Tips", description: "Receive personalized recommendations to help you save.", icon: "bulb", color: "yellow" },
  { title: "Stay Updated", description: "Understand advisories and announcements from your electricity provider.", icon: "bell", color: "red" },
];

export function FeaturesSection() {
  return (
    <section id="features" className="post-features">
      <div className="post-container">
        <MobileLandingDetails />
        <div className="post-feature-grid">
          <div className="post-phone-showcase">
            <div className="post-phone-glow" aria-hidden="true" />
            <Image
              className="post-phone-render"
              src="/assets/branding/wattsnap-smartphone.png"
              alt="WattSnap Energy App smartphone preview showing bill scanning, appliance estimates, tips, and provider advisories"
              width={1024}
              height={1536}
              sizes="(max-width: 650px) 280px, (max-width: 1000px) 330px, 400px"
            />
          </div>
          <div className="post-feature-copy">
            <h2 className="post-feature-title"><span className="post-blue-text">Smart Features</span><br />for a <span className="post-orange-text">Brighter Home</span></h2>
            <p className="post-feature-intro">Everything you need to manage your electricity usage — all in one app.</p>
            <div className="post-feature-list">
              {features.map((feature) => (
                <a key={feature.title} href="/dashboard" className="post-feature-card">
                  <div className={`post-feature-icon post-icon-${feature.color}`}>
                    {feature.icon === "bill" ? <FileText size={38} strokeWidth={2.5} aria-hidden="true" /> : <GlossyIcon name={feature.icon} />}
                  </div>
                  <div><h3>{feature.title}</h3><p>{feature.description}</p></div>
                  <ChevronRight size={21} aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
