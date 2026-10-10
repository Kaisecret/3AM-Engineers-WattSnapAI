import Image, { getImageProps } from "next/image";
import Link from "next/link";
import { preload } from "react-dom";
import { ChevronRight } from "lucide-react";
import { GlossyIcon, type GlossyIconName } from "./GlossyIcon";
import { ProductTour } from "./ProductTour";
import { CreateAccountLabel } from "./CreateAccountLabel";

const benefits: { icon: GlossyIconName; title: string; description: string; mobileDescription: string }[] = [
  { icon: "home", title: "Understand\nYour Bills", description: "Easy and clear\nexplanations", mobileDescription: "Easy and clear explanations." },
  { icon: "chart", title: "Monitor\nUsage", description: "Track your monthly\nelectricity trends", mobileDescription: "Track your monthly trends." },
  { icon: "bulb", title: "Save Energy\nSave Money", description: "Get practical tips\nfor a more efficient home", mobileDescription: "Practical tips for an efficient home." },
  { icon: "heart", title: "Practical\nGuidance", description: "Understand your usage\nwith personalized tips", mobileDescription: "Personalized tips just for you." },
];

const callouts: { name: string; icon: GlossyIconName; title: string; description: string; href: string }[] = [
  { name: "scan", icon: "camera", title: "Scan\nYour Bill", description: "Take a photo and\nreview your bill", href: "#features" },
  { name: "tips", icon: "bulb", title: "Get\nEnergy Tips", description: "Simple ways\nto save energy\nand money", href: "#features" },
  { name: "track", icon: "chart", title: "Track Your\nConsumption", description: "See usage trends\nand take control", href: "#features" },
  { name: "advisory", icon: "bell", title: "Provider\nAdvisories", description: "Review saved\nmaintenance and\ninterruption notices", href: "#how-it-works" },
];

const mobilePhone = {
  src: "/assets/branding/wattsnap-smartphone.png",
  alt: "WattSnap dashboard preview showing electricity bills, appliances, tips, and advisories",
  width: 1024,
  height: 1536,
  sizes: "(max-width: 650px) 60vw, 1px",
  quality: 70,
};

export function HeroSection() {
  // Discover the CSS background before styles load; fetch only the matching viewport.
  preload("/assets/branding/hero-bg-panorama-mobile.webp", { as: "image", type: "image/webp", media: "(max-width: 650px)", fetchPriority: "high" });
  preload("/assets/branding/hero-bg-panorama.webp", { as: "image", type: "image/webp", media: "(min-width: 651px)", fetchPriority: "high" });
  const { props: phone } = getImageProps(mobilePhone);
  preload(phone.src, { as: "image", imageSrcSet: phone.srcSet, imageSizes: phone.sizes, media: "(max-width: 650px)", fetchPriority: "high" });
  return (
    <section id="home" className="wattsnap-hero" aria-label="Your home electricity assistant">
      <div className="hero-scene" aria-hidden="true" />
      <div className="hero-veil" aria-hidden="true" />
      <div className="hero-inner">
        <div className="hero-copy">
          <div className="hero-tagline">
            <GlossyIcon name="home" />
            <span>Smart Energy. Brighter Homes.</span>
          </div>
          <h1 className="hero-title">
            <span className="sr-only">Your Home Electricity Assistant</span>
            <Image
              src="/assets/branding/hero-headline-logo.png"
              alt=""
              width={1804}
              height={872}
              sizes="(max-width: 650px) calc(86vw - 31px), (max-width: 700px) 95vw, (max-width: 1100px) 65vw, 640px"
              priority
              fetchPriority="high"
              quality={70}
            />
          </h1>
          <p className="hero-description">
            Snap your bill. Understand your usage.<br />
            Save smarter. Be ready for brownouts.
          </p>
          <div className="hero-actions">
            <Link href="/signup" className="btn-primary hero-signup landing-create-account">
              <CreateAccountLabel />
            </Link>
            <ProductTour />
          </div>
          <p className="hero-login">Already have an account? <Link href="/login">Log in</Link></p>
          <ul className="hero-benefits" aria-label="WattSnap benefits">
            {benefits.map((benefit) => (
              <li key={benefit.icon}>
                <div className="hero-benefit-icon"><GlossyIcon name={benefit.icon} /></div>
                <h2>{benefit.title}</h2>
                <p><span className="hero-benefit-desktop-text">{benefit.description}</span><span className="hero-benefit-mobile-text">{benefit.mobileDescription}</span></p>
              </li>
            ))}
          </ul>
        </div>
        <div className="hero-art">
          <Image
            className="hero-product-image"
            src="/assets/branding/wattsnap-mascot-app.png"
            alt="The friendly WattSnap robot beside a preview of the electricity assistant app"
            width={1536}
            height={1024}
            sizes="(max-width: 700px) 125vw, (max-width: 1100px) 85vw, 1150px"
            priority
            fetchPriority="high"
            quality={70}
          />
          <Image
            className="hero-mobile-phone"
            {...mobilePhone}
            fetchPriority="high"
          />
          <div className="hero-spark hero-spark-one" aria-hidden="true"><i /><i /></div>
          <div className="hero-callouts">
            {callouts.map((callout) => (
              <a key={callout.name} href={callout.href} className={`hero-callout hero-callout-${callout.name}`}>
                <div className={`hero-callout-icon hero-callout-icon-${callout.icon}`}><GlossyIcon name={callout.icon} /></div>
                <div className="hero-callout-copy">
                  <h2>{callout.title}</h2>
                  <p>{callout.description}</p>
                </div>
                <ChevronRight className="hero-callout-arrow" size={23} aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
