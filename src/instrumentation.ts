/**
 * Layer C of docs/PAYMENT-SELF-HEALING.md — an in-process timer that runs the
 * payment reconcile sweep every few minutes. No Render Cron service, no GitHub
 * Action: this runs inside the app's own Node process.
 *
 * `register()` is called once per server process on startup (Next.js 16).
 */
export async function register() {
  // Only the Node.js server runtime — never Edge, never the build step.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // Always on; `PAYMENT_SELF_HEAL_SWEEP="off"` is the only kill switch.
  if (process.env.PAYMENT_SELF_HEAL_SWEEP === "off") return;

  const INTERVAL_MS = 3 * 60_000;
  const START_DELAY_MS = 30_000; // let the server settle before the first run

  const { runReconcileSweep } = await import("@/lib/payment/reconcile-core");

  const tick = async () => {
    try {
      const summary = await runReconcileSweep({ source: "in-process-timer", lock: true });
      if (!summary.skipped && summary.scanned > 0) {
        console.log("self-heal sweep:", JSON.stringify(summary));
      }
    } catch (err) {
      console.error("self-heal sweep failed", err);
    }
  };

  setTimeout(tick, START_DELAY_MS);
  const timer = setInterval(tick, INTERVAL_MS);
  // Don't keep the process alive just for this timer.
  if (typeof timer.unref === "function") timer.unref();
}
