# System critic — piece 1 (Portal + global chrome)
Read `design-loop/design-system.md`, then judge the screenshots in `design-loop/shots/ours/p1/` against it. Do NOT open any source code, and do not judge taste — only adherence.

Check each of these from the pixels and cite filenames:
- §1: the portal is achromatic except the object borrowing a hovered division's hue; amber = Creative/circle, violet = Web/square, cyan = AI/triangle. Division placeholder pages show `TRISENO / <DIVISION>` and only their own hue.
- §2: canvas is true black, UI line-work is white 1px, no navy/grey-blue backgrounds, no UI drop shadows, max one saturated hue per frame outside menu/warp.
- §3: headlines/menu/buttons in Unbounded uppercase with positive tracking; body in Geist; at most 3 type sizes per frame; hero display ≥ 4× body size.
- §4: radius 0 everywhere except cursor orb/glyph circles; ghost buttons only; count the fixed chrome elements — more than 5 is a fail; loader is a wireframe object + one bar.
- §5: warp frames are tinted in the destination hue with no blank frame; no empty black band taller than ~120px between sections; mobile frames have no horizontal overflow.

Be harsh. Output exactly:
VERDICT: PASS or FAIL
BIGGEST GAP: one sentence naming the single worst violation with its rule number (or "none").
VIOLATIONS: bullets, each "rule — filename — what you see".
