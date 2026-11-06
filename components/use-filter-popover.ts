import { useEffect, useLayoutEffect, useRef, type FocusEvent as ReactFocusEvent } from "react";

function fitPopover(trigger: HTMLElement, panel: HTMLElement, heightLimit = Infinity) {
  const anchor = trigger.getBoundingClientRect();
  if (!anchor.width) return;

  const viewport = window.visualViewport;
  const leftEdge = (viewport?.offsetLeft ?? 0) + 12;
  const rightEdge = (viewport?.offsetLeft ?? 0) + (viewport?.width ?? window.innerWidth) - 12;
  panel.style.setProperty("--popover-available-width", `${Math.max(0, rightEdge - leftEdge)}px`);
  // Measure without the previous correction so repeated scrolls cannot accumulate it.
  panel.style.setProperty("--popover-shift-x", "0px");
  const bounds = panel.getBoundingClientRect();
  const left = Math.max(leftEdge, Math.min(bounds.left, rightEdge - bounds.width));
  panel.style.setProperty("--popover-shift-x", `${left - bounds.left}px`);

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

export function useFilterPopover<T extends HTMLElement>(
  open: boolean,
  onClose: () => void,
  kind: "date" | "venue",
) {
  const filterRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<T>(null);

  function close(restoreFocus = true) {
    if (restoreFocus) triggerRef.current?.focus({ preventScroll: true });
    onClose();
  }

  function onBlur(event: ReactFocusEvent<HTMLDivElement>) {
    if (!open) return;
    // Touch browsers and label activation can blur to the document before the
    // click reaches its control. Outside pointers/focus are handled separately.
    if (event.relatedTarget === null) return;
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
    close(false);
  }

  useEffect(() => {
    if (!open) return;
    const filter = filterRef.current;
    if (!filter) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || filter.contains(event.target)) return;
      if (filter.contains(document.activeElement)) triggerRef.current?.focus({ preventScroll: true });
      onClose();
    };
    const onFocusIn = (event: FocusEvent) => {
      if (event.target instanceof Node && !filter.contains(event.target)) onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      triggerRef.current?.focus({ preventScroll: true });
      onClose();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("blur", onClose);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("blur", onClose);
    };
  }, [open, onClose]);

  useLayoutEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger || !panel) return;

    const updatePositions = () => {
      if (kind === "date") {
        const caption = panel.querySelector<HTMLElement>(".rdp-month_caption");
        const navigation = panel.querySelector<HTMLElement>(".rdp-nav");
        const navigationBottom = navigation
          ? navigation.offsetHeight + (parseFloat(getComputedStyle(navigation).top) || 0)
          : 0;
        const headerHeight = Math.max(caption?.offsetHeight ?? 0, navigationBottom);
        panel.style.setProperty("--calendar-scroll-padding", `${headerHeight + 12}px`);
        fitPopover(trigger, panel);
      } else {
        const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
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
  }, [open, kind]);

  return { filterProps: { ref: filterRef, onBlur }, triggerRef, panelRef, close };
}
