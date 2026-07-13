import { Fragment } from "react";
import type { RichText as RichTextNodes } from "@/content/schema/primitives";

/**
 * Renders a RichText node array as inline content.
 *
 * The output DOM is byte-for-byte what the hand-written JSX produced:
 *
 *   [text "Video that sells", br, grad "while it scrolls."]
 *     → Video that sells<br/><span class="grad">while it scrolls.</span>
 *
 * That matters more than it looks. `.grad` is what paints the gradient fill via
 * background-clip:text, and Portal's char-splitter reaches for `.grad || .line` by
 * selector — so emitting a wrapper <span> around plain text, or dropping the class,
 * silently kills the gradient on half the site's headlines. Text nodes are therefore
 * rendered bare, never wrapped.
 *
 * No dangerouslySetInnerHTML anywhere: this component is the reason the CMS can
 * accept arbitrary editor input without opening an injection hole.
 */
export default function RichText({ nodes }: { nodes: RichTextNodes | undefined }) {
  if (!nodes?.length) return null;

  return (
    <>
      {nodes.map((node, i) => {
        switch (node.t) {
          case "text":
            return <Fragment key={i}>{node.v}</Fragment>;
          case "grad":
            return (
              <span className="grad" key={i}>
                {node.v}
              </span>
            );
          case "br":
            return <br key={i} />;
          case "em":
            return <em key={i}>{node.v}</em>;
          case "link":
            return (
              <a href={node.href} key={i}>
                {node.v}
              </a>
            );
          default:
            return null;
        }
      })}
    </>
  );
}
