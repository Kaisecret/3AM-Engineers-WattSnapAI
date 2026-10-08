import Image from "next/image";
import { Bell, Camera, Fan, Lightbulb, Refrigerator, Snowflake, Tv, Zap } from "lucide-react";

const mascot = "/assets/branding/Cheerful Bee Robot Thumbs-Up.png";
const appliances = [
  { label: "Refrigerator", watts: 150, Icon: Refrigerator },
  { label: "Electric Fan", watts: 60, Icon: Fan },
  { label: "Television", watts: 100, Icon: Tv },
  { label: "Air Conditioner", watts: 900, Icon: Snowflake },
];

export function IntroPreview({ step }: { step: number }) {
  if (step === 0) return <div className="intro-art intro-home-art" aria-label="WattSnap flying above an energy-efficient home">
    <Image className="intro-hero-bee" src={mascot} alt="" width={350} height={350} sizes="(min-width: 900px) 300px, 220px" priority />
    <svg className="intro-house" viewBox="0 0 380 240" role="img" aria-label="A bright home with rooftop solar panels">
      <ellipse cx="190" cy="223" rx="178" ry="15" fill="#C9EEDB" />
      <path d="M68 111 185 25 317 111v104H68Z" fill="#fff" stroke="#CFE4E8" strokeWidth="3" />
      <path d="m41 116 144-99 154 99-18 12L185 42 59 130Z" fill="#31AEC5" />
      <path d="m105 77 68-44 60 40-68 44Z" fill="#173C64" stroke="#A8E9F5" strokeWidth="2" />
      <path d="m122 66 60 40m-44-50 60 40m-8-50-68 44m87-31-68 44" stroke="#A8E9F5" strokeWidth="2" />
      <rect x="157" y="146" width="55" height="69" rx="5" fill="#FED572" /><circle cx="200" cy="181" r="3" fill="#B78121" />
      <g fill="#FFF1BC" stroke="#50A7B6" strokeWidth="4"><rect x="87" y="139" width="45" height="46" rx="5" /><rect x="237" y="139" width="55" height="46" rx="5" /></g>
      <path d="M110 139v46m155-46v46M87 162h45m105 0h55" stroke="#50A7B6" strokeWidth="3" />
      <path d="M45 215v-45m288 45v-51" stroke="#719A61" strokeWidth="7" />
      <g fill="#75C491"><circle cx="44" cy="152" r="26" /><circle cx="334" cy="150" r="27" /><ellipse cx="99" cy="210" rx="41" ry="13" /><ellipse cx="279" cy="210" rx="36" ry="13" /></g>
    </svg>
  </div>;

  if (step === 1) return <div className="intro-art intro-bill-art">
    <div className="intro-bill-guide" aria-hidden="true"><span className="intro-paper"><Zap />Electricity bill<span /><span /><span /></span><Image src={mascot} alt="" width={180} height={180} sizes="150px" /></div>
    <section className="intro-demo-card" aria-label="Example electricity bill preview">
      <div className="intro-scan"><Camera aria-hidden="true" />Scan Electricity Bill</div>
      <p className="intro-example">Example bill</p>
      <div className="intro-amount"><span>Amount Due</span><strong>₱2,480.00</strong></div>
      <dl className="intro-bill-details"><div><dt>kWh Consumption</dt><dd>210 kWh</dd></div><div><dt>Billing Period</dt><dd>Sep 1–30, 2026</dd></div><div><dt>Due Date</dt><dd>Oct 15, 2026</dd></div></dl>
    </section>
  </div>;

  if (step === 2) return <div className="intro-art intro-appliance-art">
    <section className="intro-demo-card" aria-label="Example appliance dashboard">
      <h2>My Appliances</h2><p className="intro-example">Example estimated wattage</p>
      <div className="intro-appliance-grid">{appliances.map(({ label, watts, Icon }) => <div key={label}><Icon aria-hidden="true" /><span>{label}</span><strong>{watts} W</strong></div>)}</div>
      <div className="intro-scan"><Camera aria-hidden="true" />Scan Label</div>
    </section>
    <Image className="intro-small-bee" src={mascot} alt="WattSnap guides you through appliance estimates" width={150} height={150} sizes="110px" />
  </div>;

  return <div className="intro-art intro-tips-art">
    <section className="intro-feature-card"><span className="intro-feature-icon is-yellow"><Lightbulb aria-hidden="true" /></span><div><h2>Tipid Tip</h2><p>Turn off unused appliances to reduce standby power.</p></div></section>
    <section className="intro-feature-card"><span className="intro-feature-icon"><Bell aria-hidden="true" /></span><div><h2>Provider Advisory</h2><p>Scheduled interruption may affect your area.</p></div></section>
    <Image className="intro-finish-bee" src={mascot} alt="Your friendly WattSnap guide" width={260} height={260} sizes="190px" />
  </div>;
}
