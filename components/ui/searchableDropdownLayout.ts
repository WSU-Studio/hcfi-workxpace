export interface DropdownLayout {
  left: number;
  width: number;
  maxListHeight: number;
  top?: number;
  bottom?: number;
}

export const DEFAULT_LIST_MAX_HEIGHT = 240;
export const SEARCH_ROW_HEIGHT = 45;
export const VIEWPORT_GAP = 8;

/**
 * Fixed-position dropdown geometry relative to a trigger. Flips upward when
 * there is not enough room below, and clamps width to the viewport.
 */
export function computeDropdownLayout(
  trigger: HTMLElement,
  listMaxHeight: number,
  dropdownMinWidth?: number,
): DropdownLayout {
  const rect = trigger.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_GAP;
  const spaceAbove = rect.top - VIEWPORT_GAP;
  const openUpward = spaceBelow < listMaxHeight + SEARCH_ROW_HEIGHT && spaceAbove > spaceBelow;

  const viewportMaxWidth = window.innerWidth - VIEWPORT_GAP * 2;
  const width = Math.min(viewportMaxWidth, Math.max(rect.width, dropdownMinWidth ?? rect.width));
  let left = rect.left;
  if (left + width > window.innerWidth - VIEWPORT_GAP) {
    left = Math.max(VIEWPORT_GAP, window.innerWidth - VIEWPORT_GAP - width);
  }

  if (openUpward) {
    return {
      left,
      width,
      bottom: window.innerHeight - rect.top + VIEWPORT_GAP,
      maxListHeight: Math.min(listMaxHeight, Math.max(80, spaceAbove - SEARCH_ROW_HEIGHT)),
    };
  }

  return {
    left,
    width,
    top: rect.bottom + VIEWPORT_GAP,
    maxListHeight: Math.min(listMaxHeight, Math.max(80, spaceBelow - SEARCH_ROW_HEIGHT)),
  };
}
