import TrisenoMark from "./TrisenoMark";

/* The last thing on every page: the TS mark, large and in hairline, rising out
   of the floor of the page, over a single signature line. It is content, the
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
        </div>
        <div className="sign-off__meta font-mono uppercase">
          <span>&copy; {new Date().getFullYear()}</span>
          <span>trisenosystems.com</span>
        </div>
      </div>
    </footer>
  );
}
