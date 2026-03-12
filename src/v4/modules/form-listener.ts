/**
 * Meetergo v4 — Form Listener Module
 *
 * Extracted from v3 main.ts. Auto-opens the booking modal on form submit,
 * pre-filling it with the form's field values.
 *
 * Upgrade: MutationObserver detects forms added after SDK init (SPA compat).
 */

import { errorHandler } from "../utils/error-handler.js";
import type { FormListener } from "../types/index.js";

export class FormListenerManager {
  private readonly ns: string;
  private readonly onSubmit: (link: string, prefill: Record<string, string>) => void;
  private abortController: AbortController | null = null;
  private mutationObserver: MutationObserver | null = null;
  private boundForms: Map<HTMLFormElement, (e: Event) => void> = new Map();

  constructor(ns: string, onSubmit: (link: string, prefill: Record<string, string>) => void) {
    this.ns = ns;
    this.onSubmit = onSubmit;
  }

  /**
   * Start listening to the listed forms.
   * Also sets up a MutationObserver so forms added later are auto-bound.
   */
  listen(listeners: FormListener[]): void {
    if (!listeners.length) return;

    this.abortController = new AbortController();

    // Bind existing forms
    for (const cfg of listeners) {
      this.bindForm(cfg);
    }

    // Watch for dynamically added forms
    if (typeof MutationObserver !== "undefined") {
      this.mutationObserver = new MutationObserver(() => {
        for (const cfg of listeners) {
          this.bindForm(cfg);
        }
      });
      this.mutationObserver.observe(document.body, { childList: true, subtree: true });
    }
  }

  destroy(): void {
    this.abortController?.abort();
    this.mutationObserver?.disconnect();
    this.boundForms.clear();
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private bindForm(cfg: FormListener): void {
    try {
      const form = cfg.formId
        ? (document.getElementById(cfg.formId) as HTMLFormElement | null)
        : null;

      if (!form || this.boundForms.has(form)) return;

      const handler = (e: Event) => {
        e.preventDefault();
        const prefill = this.extractFormData(form);
        this.onSubmit(cfg.link, prefill);
      };

      const signal = this.abortController?.signal;
      const opts = signal ? { signal } : undefined;
      form.addEventListener("submit", handler, opts);
      this.boundForms.set(form, handler);

    } catch (err) {
      errorHandler.handleError({
        message: "Failed to bind form listener",
        level: "warning",
        ns: this.ns,
        error: err as Error,
      });
    }
  }

  private extractFormData(form: HTMLFormElement): Record<string, string> {
    const data: Record<string, string> = {};

    // Standard FormData extraction
    try {
      const fd = new FormData(form);
      fd.forEach((value, key) => {
        if (typeof value === "string") data[key] = value;
      });
    } catch {
      // Fallback: iterate inputs
      const inputs = form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
        "input, select, textarea"
      );
      for (const input of inputs) {
        if (input.name && input.value) data[input.name] = input.value;
      }
    }

    return data;
  }
}
