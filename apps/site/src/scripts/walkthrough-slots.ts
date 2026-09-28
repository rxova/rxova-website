/** Fills a deferred walkthrough slot from its prerendered page; a failed fetch leaves the link. */
import { enhanceWalkthroughs } from "./walkthrough";

const SLOT = "[data-walkthrough-src]";
const filling = new WeakMap<HTMLElement, Promise<void>>();

async function fetchInto(slot: HTMLElement, src: string): Promise<void> {
  const response = await fetch(src);
  if (!response.ok) return;
  const page = new DOMParser().parseFromString(await response.text(), "text/html");
  const tour = page.querySelector("[data-walkthrough]");
  if (!tour || !slot.isConnected) return;
  slot.replaceWith(document.importNode(tour, true));
  enhanceWalkthroughs();
}

/** Fills the deferred slot inside `within`, once; resolves when it is in place or has failed. */
export function fillWalkthroughSlot(within: ParentNode): Promise<void> {
  const slot = within.querySelector<HTMLElement>(SLOT);
  const src = slot?.dataset.walkthroughSrc;
  if (!slot || !src) return Promise.resolve();
  let job = filling.get(slot);
  if (!job) {
    job = fetchInto(slot, src).catch(() => undefined);
    filling.set(slot, job);
  }
  return job;
}

/** Fills every slot once the page is idle, so switching projects never waits on the network. */
export function fillWalkthroughSlotsWhenIdle(): void {
  const run = () => {
    for (const slot of document.querySelectorAll<HTMLElement>(SLOT)) {
      void fillWalkthroughSlot(slot.parentElement ?? document);
    }
  };
  if ("requestIdleCallback" in window) requestIdleCallback(run, { timeout: 3000 });
  else setTimeout(run, 1500);
}
