import { ProfileAvatar } from "./DashboardArtwork";

/** The household's uploaded photo, or the default illustrated avatar. */
export default function UserAvatar({ photo, alt = "" }: { photo?: string; alt?: string }) {
  // A browser-made data URL, so next/image optimisation does not apply.
  // eslint-disable-next-line @next/next/no-img-element
  return photo ? <img className="ws-user-photo" src={photo} alt={alt} /> : <ProfileAvatar />;
}
