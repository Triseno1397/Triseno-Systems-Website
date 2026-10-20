import TrisenoMark from "./TrisenoMark";
import { SITE } from "@/lib/seo";

/* The last thing on every page: the TS mark, large and in hairline, rising out
   of the floor of the page, over a single signature line. Name, phone and
   service area match the Google Business Profile word for word. It is content, the
   last child of <main>, so ContentFade keeps it clear of the corner chrome. */
export default function SignOff() {
  return (
    <footer className="sign-off relative z-10" aria-label="Triseno Systems">
      <div aria-hidden="true" className="sign-off__giant">
        <TrisenoMark variant="line" strokeWidth={1} color="#ffffff" />
      </div>
      <div className="sign-off__row">
        <TrisenoMark className="sign-off__mark" />
        <div className="sign-off__id">
          <span className="sign-off__name font-display font-bold uppercase">Triseno Systems</span>
          <span className="sign-off__line font-mono uppercase">Ad creative / Web design / AI infrastructure</span>
          <span className="sign-off__line font-mono uppercase">{SITE.serviceAreaLine}</span>
        </div>
        <div className="sign-off__meta font-mono uppercase">
          <span>&copy; {new Date().getFullYear()}</span>
          <a href={`tel:${SITE.phoneE164}`}>{SITE.phone}</a>
          <span>trisenosystems.com</span>
        </div>
      </div>
    </footer>
  );
}
