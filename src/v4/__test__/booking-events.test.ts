import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";
import { MeetergoSDK } from "../core/sdk";

/** Deliver a message the way the browser delivers one from a framed booking page. */
function postFromBookingPage(event: string, data: unknown) {
  window.dispatchEvent(new MessageEvent("message", { data: { event, data } }));
}

function sdkWith(...namespaces: string[]) {
  const sdk = new MeetergoSDK();
  sdk.boot();
  sdk.startScanner();
  const callable = sdk.buildSDKCallable();
  namespaces.forEach((ns) => callable("init", { ns }));
  return callable;
}

describe("booking lifecycle events from the booking page", () => {
  it.each([
    ["meetergo:booking-rescheduled", "bookingRescheduled", { appointmentId: "a2", previousAppointmentId: "a1", startTime: "2026-11-10T09:00:00.000Z" }],
    ["meetergo:booking-cancelled", "bookingCancelled", { appointmentId: "a1" }],
    ["booking-successful", "bookingSuccessful", { appointmentId: "a1", secret: "s" }],
  ])("%s reaches %s subscribers and wildcard listeners", (message, event, data) => {
    const callable = sdkWith();
    const named = jest.fn();
    const wildcard = jest.fn();
    callable("on", { action: event, callback: named });
    callable("on", { action: "*", callback: wildcard });

    postFromBookingPage(message, data);

    expect(named).toHaveBeenCalledTimes(1);
    expect(named.mock.calls[0][0]).toMatchObject({ event, data, namespace: "default" });
    expect(wildcard).toHaveBeenCalledTimes(1);
  });

  it("broadcasts to every namespace, because the message names none", () => {
    const callable = sdkWith("sales", "support");
    const sales = jest.fn();
    const support = jest.fn();
    callable("on", { action: "bookingRescheduled", callback: sales, ns: "sales" });
    callable("on", { action: "bookingRescheduled", callback: support, ns: "support" });

    postFromBookingPage("meetergo:booking-rescheduled", { appointmentId: "a1", previousAppointmentId: "a1", startTime: "x" });

    expect(sales).toHaveBeenCalledTimes(1);
    expect(support).toHaveBeenCalledTimes(1);
  });

  it("does not report a reschedule or cancellation as a new booking", () => {
    const onSuccess = jest.fn();
    const onBookingSuccessful = jest.fn();
    const callable = sdkWith();
    callable("init", { ns: "legacy", onSuccess, onBookingSuccessful });
    const bookingSuccessful = jest.fn();
    callable("on", { action: "bookingSuccessful", callback: bookingSuccessful });

    postFromBookingPage("meetergo:booking-rescheduled", { appointmentId: "a1", previousAppointmentId: "a1", startTime: "x" });
    postFromBookingPage("meetergo:booking-cancelled", { appointmentId: "a1" });

    expect(onSuccess).not.toHaveBeenCalled();
    expect(onBookingSuccessful).not.toHaveBeenCalled();
    expect(bookingSuccessful).not.toHaveBeenCalled();
  });

  it("keeps calling onSuccess and onBookingSuccessful for a new booking", () => {
    const onSuccess = jest.fn();
    const onBookingSuccessful = jest.fn();
    const callable = sdkWith();
    callable("init", { ns: "legacy", onSuccess, onBookingSuccessful });

    postFromBookingPage("booking-successful", { appointmentId: "a1" });

    expect(onSuccess).toHaveBeenCalledWith({ appointmentId: "a1" });
    expect(onBookingSuccessful).toHaveBeenCalledWith({ appointmentId: "a1" });
  });

  it.each(["constructor", "toString", "__proto__", "something-else", "booking-cancelled", "booking-rescheduled"])(
    "ignores the unrelated message %s",
    (message) => {
      const callable = sdkWith();
      const wildcard = jest.fn();
      callable("on", { action: "*", callback: wildcard });

      postFromBookingPage(message, {});

      expect(wildcard).not.toHaveBeenCalled();
    },
  );
});

describe("the documented event list", () => {
  const sourceFiles = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) return name === "__test__" ? [] : sourceFiles(path);
      return path.endsWith(".ts") ? [path] : [];
    });
  const v4 = join(__dirname, "..");
  const source = sourceFiles(v4).map((file) => readFileSync(file, "utf8")).join("\n");
  const declared = [...readFileSync(join(v4, "types/index.ts"), "utf8").matchAll(/^\s+event: "(\w+)";$/gm)].map((m) => m[1]);
  const readme = readFileSync(join(v4, "../../README.md"), "utf8");

  it("declares events to check", () => {
    expect(declared).toContain("bookingRescheduled");
  });

  // Types and README rows once promised events nothing could ever send.
  it.each(declared)("%s has code that sends it", (event) => {
    const emittedDirectly = source.includes(`.emit("${event}"`);
    const bridgedFromPage = new RegExp(`\\["[\\w:-]+", "${event}"\\]`).test(source);
    expect(emittedDirectly || bridgedFromPage).toBe(true);
  });

  it.each(declared)("%s is in the README", (event) => {
    expect(readme).toContain(`| \`${event}\` |`);
  });
});
