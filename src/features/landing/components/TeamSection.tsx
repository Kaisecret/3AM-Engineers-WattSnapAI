import Image from "next/image";

export function TeamSection() {
  return <section id="team" className="post-team" aria-labelledby="team-heading"><div className="post-container">
    <h2 id="team-heading" className="post-heading">Meet the Team<span className="post-heading-spark" aria-hidden="true">✦</span></h2>
    <figure className="post-team-card">
      <Image src="/assets/team/khing-jay-regala.jpg" alt="Khing Jay Regala" width={160} height={160} sizes="160px" className="post-team-photo" />
      <figcaption><h3>Khing Jay Regala</h3><span className="post-team-role">Lead Developer</span></figcaption>
    </figure>
  </div></section>;
}
