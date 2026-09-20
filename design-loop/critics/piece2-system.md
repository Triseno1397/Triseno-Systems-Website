# System critic — piece 2: Creative division (`/studio`)
Read `design-loop/design-system.md`, then judge every screenshot in `design-loop/shots/ours/p2/` against it. Do NOT open any source code. Do not judge taste — only adherence. Cite a filename for every finding.

Check specifically:
- **§1 / D1 / D2:** the chrome lockup names this division in every frame; only this division's hue appears anywhere on the page; no other division's hue leaks in except in the final gate's cross-links.
- **§2:** DOM background is true black (no navy, grey-blue, or CSS gradient washes); UI line-work is pure white 1px; no UI drop shadows; at most one saturated hue per frame. Rendered 3D/video scenes and depicted concept mocks inside device frames are exempt — they may carry their own colour.
- **§3:** display type is Unbounded uppercase with visibly positive tracking; body is Geist; content uses at most 3 type sizes per frame, plus one small 12–13px size shared by all chrome and mono labels; no Inter/Arial/system fonts in page UI (mocks inside frames are exempt); no emoji.
- **§4:** radius 0 on buttons, cards, media frames (exceptions: cursor orb, glyph circles, depicted device frames); buttons are ghost (transparent, 1px white stroke) and never filled with colour; count fixed-to-viewport chrome elements — more than 5 is a fail.
- **§5 / M6:** every section fills the viewport with scene or media; flag any flat empty black band taller than ~120px, and any scroll position that is effectively empty. Mobile frames: no horizontal overflow, no fixed chrome covering content, no clipped text.
- **§6b:** the section must not look like the stock 21st.dev demo it was inspired by — it must carry Triseno's glyph, hue, type and copy.

Be harsh. Output exactly:
VERDICT: PASS or FAIL
BIGGEST GAP: one sentence naming the single worst violation with its rule number (or "none").
VIOLATIONS: bullets, each "rule — filename — what you see".
