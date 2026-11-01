"use client";

import { useLayoutEffect, type RefObject } from "react";

export type OpenFilter = "date" | "venue" | null;

function fitPopover(trigger: HTMLElement, panel: HTMLElement, heightLimit = Infinity) {
  const anchor = trigger.getBoundingClientRect();
  if (!anchor.width) return;

  const viewport = window.visualViewport;
  const topEdge = (viewport?.offsetTop ?? 0) + 12;
  const bottomEdge = (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight) - 12;
  const belowTop = Math.min(bottomEdge, Math.max(topEdge, anchor.bottom + 8));
  const aboveBottom = Math.max(topEdge, Math.min(bottomEdge, anchor.top - 8));
  const belowSpace = bottomEdge - belowTop;
  const aboveSpace = aboveBottom - topEdge;
  const contentHeight = panel.scrollHeight + panel.offsetHeight - panel.clientHeight;
  const preferredHeight = Math.min(contentHeight, heightLimit);
  const openAbove = preferredHeight > belowSpace && aboveSpace > belowSpace;
  const availableHeight = openAbove ? aboveSpace : belowSpace;
  const panelTop = openAbove
    ? aboveBottom - Math.min(preferredHeight, availableHeight)
    : belowTop;

  panel.style.setProperty("--popover-available-height", `${availableHeight}px`);
  panel.style.setProperty("--popover-top", `${panelTop - anchor.top}px`);
}

export function useFilterPopovers(
  dateFilterRef: RefObject<HTMLDivElement | null>,
  venueFilterRef: RefObject<HTMLDivElement | null>,
  openFilter: OpenFilter,
) {
  useLayoutEffect(() => {
    if (!openFilter) return;
    const filter = (openFilter === "date" ? dateFilterRef : venueFilterRef).current;
    const trigger = filter?.querySelector("button");
    const panel = filter?.querySelector<HTMLElement>(
      openFilter === "date" ? ".date-picker-popover" : "fieldset",
    );
    if (!trigger || !panel) return;

    const updatePositions = () => {
      if (openFilter === "date") {
        const caption = panel.querySelector<HTMLElement>(".rdp-month_caption");
        const navigation = panel.querySelector<HTMLElement>(".rdp-nav");
        const navigationBottom = navigation
          ? navigation.offsetHeight + (parseFloat(getComputedStyle(navigation).top) || 0)
          : 0;
        const headerHeight = Math.max(caption?.offsetHeight ?? 0, navigationBottom);
        panel.style.setProperty("--calendar-scroll-padding", `${headerHeight + 12}px`);
        fitPopover(trigger, panel);
      } else {
        const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
        fitPopover(trigger, panel, 25 * rem);
      }
    };

    updatePositions();
    // The calendar root stays mounted as months change, even inside a capped panel.
    const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(updatePositions);
    for (const element of [trigger, panel.querySelector(".rdp-root"), panel.querySelector(".calendar-help")]) {
      if (element) observer?.observe(element);
    }
    window.addEventListener("resize", updatePositions);
    window.addEventListener("scroll", updatePositions, true);
    window.visualViewport?.addEventListener("resize", updatePositions);
    window.visualViewport?.addEventListener("scroll", updatePositions);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updatePositions);
      window.removeEventListener("scroll", updatePositions, true);
      window.visualViewport?.removeEventListener("resize", updatePositions);
      window.visualViewport?.removeEventListener("scroll", updatePositions);
    };
  }, [dateFilterRef, venueFilterRef, openFilter]);
}
