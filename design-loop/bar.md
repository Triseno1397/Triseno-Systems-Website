# bar.md — what actually makes ohzi.io good

Reference: https://ohzi.io (live site, walked 2026-09-20: loader → hero → cube menu → warp → "Who we are" world → gate to "How we do it").
Every line is checkable by looking at a screenshot or a filmstrip. No adjectives.

1. **The world is the page.** A rendered 3D/video scene fills 100% of the viewport in every frame. There is no flat-colour DOM section anywhere. Text and UI never cover more than ~30% of the frame.

2. **One signature object is the navigation.** The hero cube carries a different glyph and a different single hue for each of the 4 destinations (door/magenta, triangle/amber, diamond/teal…). Hovering a menu word changes the object's glyph, glow colour and floor reflection within ~1s. The menu is 4 words, one lit white, three at ~35% grey, with a "1/4 – label" counter above.

3. **You travel, you don't load.** Every section change is a 2–3s full-screen transition (streak tunnel) tinted in the destination's hue. No hard cuts, no blank frame, no visible page load.

4. **One hue per world, white UI only.** Each section owns exactly one saturated hue (magenta, teal, amber). Two saturated hues never share a frame except during a gate (rule 7). All type, strokes and icons are pure white; colour comes only from the scene.

5. **Scroll moves the camera, not a document.** Copy arrives one glass card at a time: a headline plus at most two short paragraphs (≤ 45 words), max one card on screen. Cards alternate left / right, and the scene's portal object slides to the opposite side each time, so text never sits on top of the focal object.

6. **Skeletal, constant chrome.** At most 5 persistent UI elements: logo lockup top-left, hamburger top-right, back chevron bottom-left, mail icon bottom-right, vertical progress rail on the right edge labelled with the current and next section. All are 1px white line-work with no fills. The cursor is a ~40px glass orb that lenses whatever is beneath it. The loader is a wireframe of the hero object with a single progress bar — the brand starts before the page does.

7. **Every section ends in a gate.** At the end of a world the portal glyph morphs into the next section's glyph, the whole scene recolours to the next hue, and a single ghost button names the next section with a "scroll to explore" tick beneath it. There is never a footer-style dead end.

---

## Where Triseno deliberately goes past the bar (judged by the brief critic, not the craft critic)
OHZI repeats one mechanic (glass card over a world) in every section. Triseno's site is a capabilities demo, so: **no two sections may share the same primary motion mechanic**, while rules 1, 3, 4 and 6 stay constant so it still reads as one site.
