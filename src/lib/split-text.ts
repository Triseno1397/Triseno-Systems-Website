// SplitText substitute
// Wraps each character/word of an element in spans so they can be animated
// independently. Mirrors the parts of GSAP SplitText we actually need.

export type SplitMode = "chars" | "words" | "both";

export interface SplitResult {
  chars: HTMLSpanElement[];
  words: HTMLSpanElement[];
  revert: () => void;
}

interface SplitOptions {
  mode?: SplitMode;
  charClass?: string;
  wordClass?: string;
  preserveSpaces?: boolean;
}

export function splitText(
  el: HTMLElement,
  {
    mode = "chars",
    charClass = "split-char",
    wordClass = "split-word",
    preserveSpaces = true,
  }: SplitOptions = {}
): SplitResult {
  const original = el.innerHTML;
  const text = el.textContent ?? "";
  el.innerHTML = "";

  const words: HTMLSpanElement[] = [];
  const chars: HTMLSpanElement[] = [];

  const wantWords = mode === "words" || mode === "both";
  const wantChars = mode === "chars" || mode === "both";

  // Split by space, retaining spaces as separators between word spans.
  const tokens = text.split(/(\s+)/);

  tokens.forEach((token) => {
    if (token.length === 0) return;

    if (/^\s+$/.test(token)) {
      if (preserveSpaces) {
        const space = document.createElement("span");
        space.className = "split-space";
        space.style.display = "inline-block";
        space.style.whiteSpace = "pre";
        space.textContent = token;
        el.appendChild(space);
      } else {
        el.appendChild(document.createTextNode(token));
      }
      return;
    }

    const wordSpan = document.createElement("span");
    wordSpan.className = wordClass;
    wordSpan.style.display = "inline-block";
    wordSpan.style.willChange = "transform, opacity";

    if (wantChars) {
      Array.from(token).forEach((ch) => {
        const charSpan = document.createElement("span");
        charSpan.className = charClass;
        charSpan.style.display = "inline-block";
        charSpan.style.willChange = "transform, opacity";
        charSpan.textContent = ch;
        wordSpan.appendChild(charSpan);
        chars.push(charSpan);
      });
    } else {
      wordSpan.textContent = token;
    }

    el.appendChild(wordSpan);
    if (wantWords) words.push(wordSpan);
  });

  return {
    chars,
    words,
    revert: () => {
      el.innerHTML = original;
    },
  };
}
