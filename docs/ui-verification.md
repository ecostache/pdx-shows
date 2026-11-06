# UI verification

## Filter behavior

- Only one filter menu is open at a time.
- Date selection applies immediately. A second date completes an inclusive
  range; choosing the same date again completes a single-day selection.
- Venue labels and checkboxes both toggle selection using native input behavior.
  Selecting multiple venues keeps the menu open.
- Tapping inside a menu must not dismiss it merely because focus temporarily
  moves to the document. This includes calendar headings and venue labels.
- Outside pointer interactions, focus moving to an outside control, and window
  blur dismiss the menu. Escape dismisses it and restores trigger focus, even
  after an internal interaction leaves focus on the document.
- Clear filters and the empty-state Show everything action reset both filters.
- Menus fit the viewport and scroll internally when space is limited.

## November 5, 2026 review

The deployed calendar closed when its month heading was clicked. The shared
popover blur handler treated a null focus destination as leaving the filter,
which could also interrupt mobile interactions before a control activated.

The fix ignores that transient blur, watches subsequent outside focus, and
handles Escape at document level. Venue labels no longer cancel pointer-down
events or force checkbox focus before native activation.

Chrome checks covered 320 × 568 and 390 × 844 phone layouts, 844 × 390 landscape,
and 1280 × 800 desktop. Verified date selection and ranges, month navigation,
multiple venues, venue-list scrolling, combined filters, empty-result recovery,
clearing, outside dismissal, and keyboard selection and Escape. No browser
warnings or errors were captured in the final local check.

`pnpm check` passed lint, TypeScript, all 75 tests, and the production build.
Three regression tests cover transient blur, native label activation, and
dismissal after focus loss. Physical-device Safari remains unverified; Chrome
viewport checks and simulated focus events do not replace that validation.

## Repeatable manual checks

1. Open Dates, tap the month heading, and verify the menu stays open. Select a
   day, then the same day again. Repeat with a forward and reverse date range.
2. Open Venues and tap label text as well as checkboxes. Scroll the list and
   select multiple venues; confirm results match the selected dates and venues.
3. Dismiss using an outside tap, Escape, and keyboard focus leaving the menu.
   After tapping the calendar heading, verify Escape still works.
4. Select a combination with no shows, then use Show everything. Verify Clear
   filters also restores all upcoming shows and becomes disabled.
5. Repeat at phone, landscape, and desktop sizes. Check menu edges, internal
   scrolling, sticky filters, and long event titles. Check both color schemes;
   light-mode page backgrounds must remain pure white.

## Screenshots

[Current filtered mobile result](visual-review/mobile-filters-fixed.jpg) was
captured during this review. The existing PNG files in `visual-review/` are
earlier visual references for light/dark, tablet, and mobile layouts; they are
not evidence of this interaction fix or physical-device testing.
