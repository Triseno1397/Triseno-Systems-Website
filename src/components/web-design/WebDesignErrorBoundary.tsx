"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class WebDesignErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[WebDesign] render error:", error, info);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex min-h-[100dvh] items-center justify-center px-6"
          style={{ background: "#050810", color: "#ffffff" }}
        >
          <div className="text-center">
            <div className="text-[11px] uppercase tracking-[0.3em] text-white/45">
              Web design division
            </div>
            <p className="mt-4 text-2xl font-semibold tracking-tight">
              Loading experience…
            </p>
            <p className="mt-2 text-sm text-white/55">
              If this persists, refresh the page.
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
