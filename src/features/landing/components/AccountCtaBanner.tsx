import Image from "next/image";
import Link from "next/link";
import { LogIn } from "lucide-react";
import { CreateAccountLabel } from "./CreateAccountLabel";

export function AccountCtaBanner() {
  return (
    <section id="get-started" className="post-account-section">
      <div className="post-container">
        <div className="post-account-banner">
          <div className="post-account-copy">
            <h2>Get Started with WattSnap<span aria-hidden="true">✦</span></h2>
            <p>Manage your electricity and save money.<br />Your brighter home starts in your browser.</p>
            <div className="post-account-actions">
              <Link href="/signup" className="post-account-signup landing-create-account"><CreateAccountLabel /></Link>
              <Link href="/login" className="post-account-login"><LogIn size={20} aria-hidden="true" /> Log in</Link>
            </div>
          </div>
          <div className="post-account-art" aria-hidden="true">
            <Image className="post-account-mascot" src="/assets/branding/wattsnap-mascot.png" alt="" width={350} height={350} sizes="(max-width: 650px) 230px, 350px" />
            <Image className="post-account-phone" src="/assets/branding/wattsnap-smartphone.png" alt="" width={150} height={225} sizes="150px" />
          </div>
          <span className="post-banner-cloud post-banner-cloud-one" aria-hidden="true" />
          <span className="post-banner-cloud post-banner-cloud-two" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
