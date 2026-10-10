import { House, Lightbulb, ReceiptText } from "lucide-react";
const uses = [
  { title: "Understand your bills", detail: "A clear starting point", text: "Keep your reviewed bills together and compare consumption recorded for each saved period.", color: "blue", Icon: ReceiptText },
  { title: "Build useful habits", detail: "Practical local guidance", text: "Review your appliance inputs and try energy-saving ideas that explain why they apply to your home.", color: "green", Icon: Lightbulb },
  { title: "Prepare your household", detail: "Your saved provider notices", text: "Keep original announcements, check their listed areas, and prepare for the published schedule.", color: "orange", Icon: House },
];
export function TestimonialsSection() {
  return <section id="about" className="post-testimonials"><div className="post-container">
    <h2 className="post-heading">Made for Everyday Households<span className="post-heading-spark" aria-hidden="true">✦</span></h2>
    <div className="post-review-grid">{uses.map(({ title, detail, text, color, Icon }) => <article key={title} className="post-review">
      <div className="post-use-heading"><span className={`post-avatar post-avatar-${color}`} aria-hidden="true"><Icon size={28} /></span><div><h3>{title}</h3><span className="post-stars">{detail}</span></div></div>
      <p className="post-review-message">{text}</p>
    </article>)}</div>
    <p className="post-review-note">Photos help you enter and review values. Automatic extraction and live outage monitoring are unavailable.</p>
  </div></section>;
}
