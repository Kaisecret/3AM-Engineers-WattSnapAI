import Image from "next/image";
import { ArrowRight, Bell, Leaf, Megaphone, Zap } from "lucide-react";
import { EcoIllustration } from "./EcoIllustration";

export function SpotlightSection() {
  return (
    <section className="post-spotlights" aria-label="Prepared households and a brighter future">
      <div className="post-container post-spotlight-grid">
        <article className="post-spotlight post-spotlight-ready">
          <div className="post-spotlight-copy">
            <h2>Be Ready for<br />What’s Next <Zap size={24} fill="#ffd61a" stroke="#ffbd00" aria-hidden="true" /></h2>
            <p>Understand power advisories, outages, and maintenance schedules in your area.</p>
            <a href="/advisories" className="post-small-link">Review advisories <ArrowRight size={17} aria-hidden="true" /></a>
          </div>
          <div className="post-readiness-art" aria-hidden="true">
            <span className="post-alert-bubble"><Bell size={46} fill="#ffd128" stroke="#ff9d00" strokeWidth={1.5} /></span>
            <Image src="/assets/branding/Cheerful Bee Robot Thumbs-Up.png" alt="" width={250} height={250} sizes="(max-width: 650px) 150px, 250px" />
            <Megaphone className="post-megaphone" size={68} strokeWidth={1.5} />
          </div>
        </article>
        <article id="mission" className="post-spotlight post-spotlight-mission">
          <div className="post-spotlight-copy">
            <h2><span className="post-blue-text">Smarter Homes</span><br /><span className="post-green-text">Brighter Tomorrows</span> <Leaf size={23} fill="#24d27a" stroke="#09ae70" aria-hidden="true" /></h2>
            <p>Small changes make a big difference. WattSnap helps you build better energy habits for a sustainable and brighter future.</p>
            <a href="#how-it-works" className="post-small-link">Our Mission <ArrowRight size={17} aria-hidden="true" /></a>
          </div>
          <div className="post-eco-art"><EcoIllustration /></div>
        </article>
      </div>
    </section>
  );
}
