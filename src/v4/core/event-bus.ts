/**
 * Meetergo v4 — Typed Event Bus
 *
 * Supports:
 * - Named typed subscriptions  on("bookingSuccessful", handler)
 * - Wildcard subscriptions     on("*", handler)  — receives every event
 * - One-time subscriptions     once("bookingSuccessful", handler)
 * - Unsubscribe via returned cleanup function
 */

import type {
  MeetergoEvent,
  MeetergoEventEnvelope,
  EventHandler,
  WildcardHandler,
} from "../types/index.js";

type AnyHandler = EventHandler<MeetergoEvent> | WildcardHandler;

export class EventBus {
  private readonly ns: string;
  private handlers: Map<string, Set<AnyHandler>> = new Map();

  constructor(namespace: string) {
    this.ns = namespace;
  }

  /**
   * Subscribe to a named event or the wildcard "*".
   * Returns an unsubscribe function.
   */
  on(event: string, handler: AnyHandler): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);

    return () => this.off(event, handler);
  }

  /**
   * Unsubscribe a handler from an event.
   */
  off(event: string, handler: AnyHandler): void {
    this.handlers.get(event)?.delete(handler);
  }

  /**
   * Subscribe to an event once; auto-removes after first invocation.
   */
  once(event: string, handler: AnyHandler): void {
    const wrapper: AnyHandler = (payload) => {
      (handler as (p: unknown) => void)(payload);
      this.off(event, wrapper);
    };
    this.on(event, wrapper);
  }

  /**
   * Emit an event. Delivers to named handlers first, then wildcard handlers.
   */
  emit<T = unknown>(eventName: string, data: T): void {
    const envelope: MeetergoEventEnvelope<T> = {
      event: eventName,
      namespace: this.ns,
      data,
      ts: Date.now(),
    };

    // Named handlers
    const named = this.handlers.get(eventName);
    if (named) {
      for (const h of named) {
        try {
          (h as (e: MeetergoEventEnvelope<T>) => void)(envelope);
        } catch (err) {
          console.error(`[Meetergo/${this.ns}] Error in "${eventName}" handler:`, err);
        }
      }
    }

    // Wildcard handlers (skip re-delivering if event name is "*")
    if (eventName !== "*") {
      const wildcards = this.handlers.get("*");
      if (wildcards) {
        for (const h of wildcards) {
          try {
            (h as (e: MeetergoEventEnvelope<T>) => void)(envelope);
          } catch (err) {
            console.error(`[Meetergo/${this.ns}] Error in wildcard handler:`, err);
          }
        }
      }
    }
  }

  /**
   * Remove all handlers for a specific event, or all handlers entirely.
   */
  removeAll(event?: string): void {
    if (event) {
      this.handlers.delete(event);
    } else {
      this.handlers.clear();
    }
  }

  /** Total number of registered handlers across all events. */
  get size(): number {
    let count = 0;
    for (const set of this.handlers.values()) count += set.size;
    return count;
  }
}
