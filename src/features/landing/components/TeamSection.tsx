import Image from "next/image";

type Member = { name: string; role: string; photo: string; site: "github" | "facebook"; href: string; label: string; lead?: boolean };
const gh = (handle: string) => ({ site: "github" as const, href: `https://github.com/${handle}`, label: `@${handle}` });
// Lead sits in the middle of the row.
const team: Member[] = [
  { name: "Marl Ellie Alfonga", role: "Hustler · Pitcher", photo: "marl-ellie-alfonga", site: "facebook", href: "https://web.facebook.com/lord.masterrr", label: "Facebook" },
  { name: "Noyche Von Palma", role: "Hacker · Backend", photo: "noyche-von-palma", ...gh("Xx4Fun") },
  { name: "Khing Jay Regala", role: "Lead Developer", photo: "khing-jay-regala", ...gh("Kaisecret"), lead: true },
  { name: "Jose Ramson Bayog", role: "Hipster · UI/UX Designer", photo: "jose-ramson-bayog", ...gh("noirtensura") },
  { name: "Renze Bandiola", role: "Hacker · Backend", photo: "renze-bandiola", ...gh("Rhanze") },
];

const icons = {
  github: "M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z",
  facebook: "M16 8.05A8 8 0 1 0 6.75 15.95v-5.59H4.72V8.05h2.03V6.29c0-2 1.19-3.11 3.02-3.11.88 0 1.79.16 1.79.16v1.97h-1.01c-.99 0-1.3.62-1.3 1.25v1.49h2.22l-.35 2.31H9.25v5.59A8 8 0 0 0 16 8.05z",
};

export function TeamSection() {
  return <section id="team" className="post-team" aria-labelledby="team-heading"><div className="post-container">
    <h2 id="team-heading" className="post-heading">Meet the 3AM Engineers<span className="post-heading-spark" aria-hidden="true">✦</span></h2>
    <div className="post-team-grid">{team.map(member => {
      const size = member.lead ? 150 : 104;
      return <figure key={member.href} className={`post-team-card${member.lead ? " post-team-lead" : ""}`}>
        <Image src={`/assets/team/${member.photo}.jpg`} alt={member.name} width={size} height={size} sizes={`${size}px`} className="post-team-photo" />
        <figcaption>
          <h3>{member.name}</h3>
          <span className="post-team-role">{member.role}</span>
          <a className="post-team-link" href={member.href} target="_blank" rel="noopener noreferrer">
            <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><path d={icons[member.site]} /></svg>
            {member.site === "github" && <span className="sr-only">GitHub </span>}{member.label}
          </a>
        </figcaption>
      </figure>;
    })}</div>
  </div></section>;
}
