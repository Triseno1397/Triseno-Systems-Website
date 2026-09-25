"use client";

import { Component, type ReactNode } from "react";

/* If the WebGL context cannot be created (a blocklisted GPU, a browser with
   3D switched off) or the scene throws while it boots, the page falls back to
   its 2D world instead of a blank one. This replaces feature-detecting with a
   throwaway context: creating that context was the tab's whole GPU start-up —
   over a second of frozen loader before the real canvas ever asked for one. */
export default class SceneGuard extends Component<{ onFail: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFail();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
