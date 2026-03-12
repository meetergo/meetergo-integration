/**
 * Meetergo v4 — Loader Snippet
 *
 * This is the tiny ~300-byte script that users paste into their <head>.
 * It sets up a queue so that `meetergo(...)` calls made before the full
 * SDK loads are not lost.
 *
 * Output of this file is meant to be minified and inlined as a <script> tag.
 *
 * Usage in HTML:
 * ─────────────────────────────────────────────────────────────────────────────
 * <script>
 *   (function(w,d,s){
 *     w.meetergo=w.meetergo||function(){(w.meetergo.q=w.meetergo.q||[]).push(arguments)};
 *     w.meetergo.version='4';
 *     var e=d.createElement(s);e.async=1;
 *     e.src='https://cdn.meetergo.com/v4/browser.js';
 *     d.head.appendChild(e);
 *   })(window,document,'script');
 *
 *   meetergo('init', {
 *     floatingButton: { link: 'https://cal.meetergo.com/your-link', text: 'Book a meeting' }
 *   });
 * </script>
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * When browser.js loads, it:
 *   1. Creates the real MeetergoSDK instance
 *   2. Drains window.meetergo.q
 *   3. Replaces window.meetergo with the real callable
 */

export const LOADER_SNIPPET = `(function(w,d,s,u){w.meetergo=w.meetergo||function(){(w.meetergo.q=w.meetergo.q||[]).push(arguments)};w.meetergo.version='4';var e=d.createElement(s);e.async=1;e.src=u;d.head.appendChild(e);})(window,document,'script','https://cdn.meetergo.com/v4/browser.js');`;

/**
 * Generate the full snippet for a given CDN URL.
 * Can be used server-side to inject the correct URL into HTML templates.
 */
export function generateLoaderSnippet(cdnUrl = "https://cdn.meetergo.com/v4/browser.js"): string {
  return `(function(w,d,s,u){w.meetergo=w.meetergo||function(){(w.meetergo.q=w.meetergo.q||[]).push(arguments)};w.meetergo.version='4';var e=d.createElement(s);e.async=1;e.src=u;d.head.appendChild(e);})(window,document,'script','${cdnUrl}');`;
}
