import type { Metadata } from "next";
import { notFound } from "next/navigation";
import WorldPlate from "@/components/world/WorldPlate";
import GlassPanel from "@/components/world/GlassPanel";
import Glyph from "@/components/world/Glyph";
import GhostButton from "@/components/ui/GhostButton";
import { DIVISIONS } from "@/lib/divisions";
import { ANSWERS, answerBySlug, answersFor } from "@/lib/answers";
import { SITE, jsonLdHtml } from "@/lib/seo";
import { plateForDivision } from "@/components/world/plates";
import "../../contact.css";

/**
 * /answers/[slug] — one buying-stage question, answered.
 *
 * Deliberately not a blog. It mounts the same world every other page does
 * (the plate behind, the chrome above, one glass panel holding the copy) so
 * a visitor who arrives here from a search lands somewhere that is obviously
 * part of the site, and a visitor who arrives from the division page does not
 * feel handed off to a different product.
 *
 * Fully static and server-rendered: the whole answer is in the HTML, which is
 * the entire point of the page. It carries Article and BreadcrumbList data,
 * and the question itself as a QAPage, which is the shape an assistant can
 * lift a direct answer out of.
 */
export const dynamic = "force-static";

export function generateStaticParams() {
  return ANSWERS.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const a = answerBySlug(slug);
  if (!a) return {};
  const url = `${SITE.url}/answers/${a.slug}`;
  const og = `/og/${a.division === "creative" ? "studio" : a.division === "web" ? "web-design" : "ai-infrastructure"}.png`;
  return {
    title: `${a.title} | Triseno Systems`,
    description: a.description,
    keywords: a.keywords,
    alternates: { canonical: `/answers/${a.slug}` },
    openGraph: {
      title: a.title,
      description: a.description,
      url,
      siteName: SITE.name,
      type: "article",
      locale: "en_US",
      images: [{ url: og, width: 1200, height: 630, alt: a.title }],
    },
    twitter: { card: "summary_large_image", title: a.title, description: a.description, images: [og] },
  };
}

export default async function AnswerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = answerBySlug(slug);
  if (!a) notFound();

  const division = DIVISIONS[a.division];
  const url = `${SITE.url}/answers/${a.slug}`;
  const siblings = answersFor(a.division).filter((x) => x.slug !== a.slug);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${url}#article`,
        headline: a.title,
        description: a.description,
        articleSection: division.name,
        dateModified: a.updated,
        datePublished: a.updated,
        inLanguage: "en-US",
        mainEntityOfPage: url,
        author: { "@id": `${SITE.url}/#organization` },
        publisher: { "@id": `${SITE.url}/#organization` },
        isPartOf: { "@id": `${SITE.url}/#website` },
      },
      {
        "@type": "QAPage",
        "@id": `${url}#qa`,
        mainEntity: {
          "@type": "Question",
          name: a.question,
          text: a.question,
          answerCount: 1,
          acceptedAnswer: { "@type": "Answer", text: a.answer, url },
        },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
          { "@type": "ListItem", position: 2, name: division.name, item: `${SITE.url}${division.route}` },
          { "@type": "ListItem", position: 3, name: a.h1, item: url },
        ],
      },
    ],
  };

  return (
    <main className="contact-world answer-world relative text-white" style={{ ["--hue" as string]: division.hue }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(jsonLd) }} />

      <div aria-hidden="true" data-world-layer="" className="contact-world__scene">
        <WorldPlate world={plateForDivision(a.division)} stations={false} hue={division.hue} tint={0.5} />
        <span className="contact-world__scrim contact-world__scrim--top" />
        <span className="contact-world__scrim contact-world__scrim--bottom" />
      </div>

      <section data-rail="Answer" aria-labelledby="answer-title" className="answer-section">
        <GlassPanel world={plateForDivision(a.division)} className="answer-panel" veil={0.6}>
          <nav aria-label="Breadcrumb" className="answer-crumbs">
            <a href={division.route} className="answer-crumb">
              <Glyph kind={division.glyph} size={11} color="currentColor" strokeWidth={1.25} />
              <span>{division.name}</span>
            </a>
            <span aria-hidden="true">/</span>
            <span className="answer-crumb answer-crumb--here">Answers</span>
          </nav>

          <h1 id="answer-title" className="answer-h1 font-display font-bold">
            {a.h1}
          </h1>

          {/* the whole answer, before anything else: it is what a reader in a
              hurry needs and what an assistant quotes */}
          <p className="answer-lede">{a.answer}</p>

          <div className="answer-body">
            {a.blocks.map((b) => (
              <section key={b.h} className="answer-block">
                <h2 className="answer-h2 font-display font-semibold">{b.h}</h2>
                {b.p.map((text) => (
                  <p key={text.slice(0, 40)}>{text}</p>
                ))}
                {b.list ? (
                  <dl className="answer-list">
                    {b.list.map((item) => (
                      <div key={item.t} className="answer-list__row">
                        <dt>{item.t}</dt>
                        <dd>{item.d}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
              </section>
            ))}
          </div>

          <footer className="answer-foot">
            <p className="answer-foot__line">
              This is what {division.name} at Triseno Systems does every day. Tell us what you are working on and we
              will tell you what we would do.
            </p>
            <div className="answer-foot__actions">
              <GhostButton href={`/contact?division=${a.division}`}>Start a conversation</GhostButton>
              <a href={division.route} className="answer-textlink world-underline">
                {division.name}
              </a>
            </div>
            {siblings.length ? (
              <ul className="answer-more">
                {siblings.map((s) => (
                  <li key={s.slug}>
                    <a href={`/answers/${s.slug}`} className="answer-textlink world-underline">
                      {s.h1}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="answer-updated">
              Updated{" "}
              {new Date(a.updated).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </footer>
        </GlassPanel>
      </section>
    </main>
  );
}
