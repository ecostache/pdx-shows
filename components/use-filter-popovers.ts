"use client";

import { useLayoutEffect, type RefObject } from "react";

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
  datePickerOpen: boolean,
  venuePickerOpen: boolean,
) {
  useLayoutEffect(() => {
    const dateFilter = dateFilterRef.current;
    const venueFilter = venueFilterRef.current;
    const dateTrigger = dateFilter?.querySelector("button");
    const calendar = dateFilter?.querySelector<HTMLElement>(".date-picker-popover");
    const venueTrigger = venueFilter?.querySelector("button");
    const venues = venueFilter?.querySelector("fieldset");

    function updatePositions() {
      if (dateTrigger && calendar) {
        const caption = calendar.querySelector<HTMLElement>(".rdp-month_caption");
        const navigation = calendar.querySelector<HTMLElement>(".rdp-nav");
        const navigationBottom = navigation
          ? navigation.offsetHeight + (parseFloat(getComputedStyle(navigation).top) || 0)
          : 0;
        const headerHeight = Math.max(caption?.offsetHeight ?? 0, navigationBottom);
        calendar.style.setProperty("--calendar-scroll-padding", `${headerHeight + 12}px`);
        fitPopover(dateTrigger, calendar);
      }
      if (venuePickerOpen && venueTrigger && venues) {
        const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
        fitPopover(venueTrigger, venues, 25 * rem);
      }
    }

    updatePositions();
    // The calendar root stays mounted as months change, even inside a capped panel.
    const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(updatePositions);
    for (const element of [dateTrigger, venueTrigger, calendar?.querySelector(".rdp-root")]) {
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
  }, [dateFilterRef, venueFilterRef, datePickerOpen, venuePickerOpen]);
}
