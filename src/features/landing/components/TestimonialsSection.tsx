import { Quote, Star } from "lucide-react";

const testimonials = [
  { name: "Maria S.", avatar: "👩🏻", review: "WattSnap helped me understand my bill. Now I know where my money goes!", color: "blue" },
  { name: "John R.", avatar: "👨🏻", review: "The energy tips are super helpful. Our bill is lower compared to last month!", color: "green" },
  { name: "Anna L.", avatar: "👩🏽", review: "I love the clean and simple design. It’s very easy to use!", color: "orange" },
];

export function TestimonialsSection() {
  return (
    <section id="about" className="post-testimonials">
      <div className="post-container">
        <h2 className="post-heading">What Users Are Saying<span className="post-heading-spark" aria-hidden="true">✦</span></h2>
        <div className="post-review-grid">
          {testimonials.map((testimonial) => (
            <figure key={testimonial.name} className="post-review">
              <figcaption>
                <span className={`post-avatar post-avatar-${testimonial.color}`} aria-hidden="true">{testimonial.avatar}</span>
                <div><h3>{testimonial.name}</h3><span className="post-stars" role="img" aria-label="5 out of 5 stars">{Array.from({ length: 5 }, (_, index) => <Star key={index} size={14} fill="currentColor" strokeWidth={1} aria-hidden="true" />)}</span></div>
                <Quote className="post-quote-mark" size={29} fill="currentColor" aria-hidden="true" />
              </figcaption>
              <blockquote>“{testimonial.review}”</blockquote>
            </figure>
          ))}
        </div>
        <p className="post-review-note">Illustrative feedback shown for this prototype.</p>
      </div>
    </section>
  );
}