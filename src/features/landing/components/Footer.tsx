import Image from "next/image";
import Link from "next/link";

const productLinks = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Sign up", href: "/signup" },
  { label: "Log in", href: "/login" },
];

const capabilities = ["Bill Photo & Review", "Watt-If Simulator", "Tipid Tips & Budget", "Brownout Ready Mode"];
const coverage = ["ANTECO validation", "Manual provider selection", "Saved offline access", "Browser storage"];

export function Footer() {
  return (
    <footer className="landing-footer">
      <div className="landing-footer-inner">
        <div className="landing-footer-grid">
          <div className="landing-footer-brand">
            <Link href="/" className="landing-footer-logo" aria-label="WattSnap home">
              <Image src="/assets/branding/wattsnap-logo.png" alt="WattSnap" width={1983} height={793} sizes="168px" />
            </Link>
            <p>Your smart home electricity assistant. Scan power bills, analyze consumption habits, and be ready for brownouts.</p>
          </div>

          <nav className="landing-footer-group landing-footer-product" aria-label="Product">
            <h2>Product</h2>
            <ul>
              {productLinks.map((link) => (
                <li key={link.href}><Link href={link.href}>{link.label}</Link></li>
              ))}
              <li><Link href="/dashboard" className="landing-footer-highlight">Household Dashboard</Link></li>
            </ul>
          </nav>

          <div className="landing-footer-group landing-footer-capabilities">
            <h2>Capabilities</h2>
            <ul>
              {capabilities.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>

          <div className="landing-footer-group landing-footer-coverage">
            <h2>Coverage</h2>
            <ul>
              {coverage.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        </div>

        <div className="landing-footer-bottom">
          <p className="landing-footer-disclaimer">
            WattSnap AI is an independent consumer electricity assistant. Initial validation focuses on ANTECO billing structures. Not affiliated with distribution electric utilities.
          </p>
          <p className="landing-footer-copyright">© 2026 WattSnap AI. Built for brighter homes.</p>
        </div>
      </div>
    </footer>
  );
}
