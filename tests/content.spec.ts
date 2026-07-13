import { test, expect, type Page } from "@playwright/test";

/**
 * Content-fidelity gate for the Phase 1 refactor.
 *
 * The screenshot suite proves the site still *looks* the same. This one proves it still
 * *says* the same thing — which is the failure mode that actually threatens this refactor.
 * Lifting copy out of JSX into JSON is exactly where you drop a <br/>, lose a
 * `<span class="grad">`, silently reorder a reel list, or truncate a caption. Several of
 * those move too few pixels to trip a screenshot diff, but every one is a real regression.
 *
 * So: serialise the page's semantic content to text and snapshot that.
 * `.grad` spans are captured with explicit [[…]] markers so a lost gradient is a diff,
 * not a silent downgrade.
 */

const ROUTES = [
  { path: "/", name: "home-portal" },
  { path: "/studio", name: "studio" },
  { path: "/portfolio", name: "work" },
  { path: "/contact", name: "contact" },
] as const;

async function extractContent(page: Page) {
  return page.evaluate(() => {
    /** Serialise an element's inline content, marking gradient spans and line breaks. */
    const inline = (el: Element): string => {
      let out = "";
      el.childNodes.forEach((n) => {
        if (n.nodeType === Node.TEXT_NODE) {
          out += n.textContent ?? "";
        } else if (n instanceof HTMLBRElement) {
          out += "\\n";
        } else if (n instanceof HTMLElement) {
          // The gradient span is meaningful content structure, not styling noise:
          // it is the thing the RichText model has to preserve.
          out += n.classList.contains("grad") ? `[[${inline(n)}]]` : inline(n);
        }
      });
      return out.replace(/\s+/g, " ").trim();
    };

    const textOf = (sel: string) =>
      Array.from(document.querySelectorAll(sel))
        .map(inline)
        .filter(Boolean);

    return {
      title: document.title,
      metaDescription:
        document.querySelector('meta[name="description"]')?.getAttribute("content") ?? null,
      headings: Array.from(document.querySelectorAll("h1, h2, h3, h4")).map((h) => ({
        tag: h.tagName.toLowerCase(),
        text: inline(h),
      })),
      paragraphs: textOf("p"),
      links: Array.from(document.querySelectorAll("a")).map((a) => ({
        text: inline(a),
        href: a.getAttribute("href"),
      })),
      buttons: textOf("button"),
      // Media is content: a reordered or dropped reel must fail this test.
      videos: Array.from(document.querySelectorAll("video")).map((v) => v.getAttribute("src")),
      images: Array.from(document.querySelectorAll("img")).map((i) => ({
        src: i.getAttribute("src"),
        alt: i.getAttribute("alt"),
      })),
      // Form controls (the contact + studio inquiry forms).
      fields: Array.from(document.querySelectorAll("input, select, textarea")).map((f) => ({
        name: f.getAttribute("name"),
        type: f.getAttribute("type") ?? f.tagName.toLowerCase(),
        options:
          f instanceof HTMLSelectElement
            ? Array.from(f.options).map((o) => o.text)
            : undefined,
      })),
      // The decorative marquee is masked in the visual suite, so assert its words here.
      marquee: textOf(".foot-marq .word"),
    };
  });
}

for (const route of ROUTES) {
  test(`content: ${route.name}`, async ({ page }) => {
    await page.goto(route.path);
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => document.fonts.ready);

    const content = await extractContent(page);
    expect(JSON.stringify(content, null, 2)).toMatchSnapshot(`${route.name}.json`);
  });
}
