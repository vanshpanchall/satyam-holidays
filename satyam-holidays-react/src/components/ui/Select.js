import React, {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { PiCaretDown, PiCheck } from "react-icons/pi";
import { ScrollArea } from "./Scrollbar";

/*
 * Custom select (WAI-ARIA "select-only combobox" pattern).
 * Keyboard: ↑/↓ move, Home/End, Enter/Space choose, Esc close, type letters to jump.
 * The list renders in a portal with fixed positioning so it never gets clipped by
 * modals or overflow containers, and flips upwards when there's no room below.
 *
 * options: [{ value, label, hint?, disabled? }]   value: string
 * variant: "field" (form input look) | "bare" (inline, inherits colour) | "pill" (compact rounded)
 */

const MENU_MAX = 288; // px, matches max-h-72
const GAP = 6;

const triggerStyles = {
  field:
    "h-12 w-full rounded-xl border border-line bg-surface px-4 text-[15px] text-fg hover:border-fg/30 aria-expanded:border-accent aria-expanded:ring-4 aria-expanded:ring-saffron-500/15",
  pill: "h-10 rounded-full border border-line bg-surface px-4 text-sm text-fg hover:border-fg/30 aria-expanded:border-fg/50",
  bare: "w-full bg-transparent text-[15px]",
};

const Select = ({
  value,
  onChange,
  options,
  placeholder = "Select…",
  variant = "field",
  id,
  name,
  disabled = false,
  invalid = false,
  className = "",
  menuClassName = "",
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  onBlur,
}) => {
  const autoId = useId();
  const baseId = id || `select-${autoId}`;
  const listId = `${baseId}-list`;
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const typeahead = useRef({ text: "", timer: null });
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [position, setPosition] = useState(null);

  const selectedIndex = useMemo(
    () => options.findIndex((o) => String(o.value) === String(value ?? "")),
    [options, value]
  );
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;

  const enabledIndex = (start, step) => {
    for (let i = start, n = 0; n < options.length; i += step, n += 1) {
      const idx = (i + options.length) % options.length;
      if (!options[idx].disabled) return idx;
    }
    return -1;
  };

  const place = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom - GAP;
    const above = rect.top - GAP;
    const dropUp = below < Math.min(MENU_MAX, 200) && above > below;
    // Keep the (min 200px) menu inside the viewport when the trigger sits near the right edge
    const width = Math.min(Math.max(rect.width, 200), window.innerWidth - GAP * 2);
    setPosition({
      left: Math.max(GAP, Math.min(rect.left, window.innerWidth - width - GAP)),
      width,
      maxHeight: Math.max(160, Math.min(MENU_MAX, (dropUp ? above : below) - 8)),
      ...(dropUp ? { bottom: window.innerHeight - rect.top + GAP } : { top: rect.bottom + GAP }),
    });
  }, []);

  const openMenu = (index = selectedIndex >= 0 ? selectedIndex : enabledIndex(0, 1)) => {
    if (disabled) return;
    place();
    setActiveIndex(index);
    setOpen(true);
  };

  const close = (focusTrigger = true) => {
    setOpen(false);
    if (focusTrigger) triggerRef.current?.focus();
  };

  const choose = (index) => {
    const option = options[index];
    if (!option || option.disabled) return;
    if (String(option.value) !== String(value ?? "")) onChange?.(option.value);
    close();
  };

  // Keep the menu attached while the page or any ancestor scrolls / resizes
  useLayoutEffect(() => {
    if (!open) return undefined;
    place();
    const onMove = (e) => {
      if (menuRef.current?.contains(e.target)) return; // scrolling inside the list
      place();
    };
    window.addEventListener("resize", place);
    window.addEventListener("scroll", onMove, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open, place]);

  // Close on outside pointer
  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e) => {
      if (triggerRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      close(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  // Keep the highlighted option in view
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    menuRef.current
      ?.querySelector(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView?.({ block: "nearest" });
  }, [open, activeIndex]);

  const onTypeahead = (key) => {
    const t = typeahead.current;
    clearTimeout(t.timer);
    t.text += key.toLowerCase();
    t.timer = setTimeout(() => (t.text = ""), 600);
    const start = open ? activeIndex + 1 : selectedIndex + 1;
    for (let n = 0; n < options.length; n += 1) {
      const idx = (start + n) % options.length;
      if (!options[idx].disabled && String(options[idx].label).toLowerCase().startsWith(t.text)) {
        if (open) setActiveIndex(idx);
        else if (String(options[idx].value) !== String(value ?? "")) onChange?.(options[idx].value);
        return;
      }
    }
  };

  const onKeyDown = (e) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!open) openMenu();
        else setActiveIndex((i) => enabledIndex(i + 1, 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        if (!open) openMenu();
        else setActiveIndex((i) => enabledIndex(i - 1, -1));
        break;
      case "Home":
        if (open) {
          e.preventDefault();
          setActiveIndex(enabledIndex(0, 1));
        }
        break;
      case "End":
        if (open) {
          e.preventDefault();
          setActiveIndex(enabledIndex(options.length - 1, -1));
        }
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (open) choose(activeIndex);
        else openMenu();
        break;
      case "Escape":
        if (open) {
          e.preventDefault();
          e.stopPropagation(); // don't also close a parent modal
          close();
        }
        break;
      case "Tab":
        if (open) close(false);
        break;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) onTypeahead(e.key);
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        id={baseId}
        type="button"
        role="combobox"
        name={name}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={
          open && activeIndex >= 0 ? `${baseId}-opt-${activeIndex}` : undefined
        }
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        aria-invalid={invalid || undefined}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        className={`flex items-center justify-between gap-3 text-left transition focus:outline-none focus-visible:ring-4 focus-visible:ring-saffron-500/20 disabled:cursor-not-allowed disabled:opacity-50 ${
          triggerStyles[variant]
        } ${invalid ? "!border-red-400" : ""} ${className}`}
      >
        <span className={`truncate ${selected ? "" : "opacity-60"}`}>
          {selected ? selected.label : placeholder}
        </span>
        <PiCaretDown
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 opacity-60 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open &&
        position &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              left: position.left,
              width: position.width,
              top: position.top,
              bottom: position.bottom,
            }}
            className={`z-[100] overflow-hidden rounded-2xl border border-line bg-surface text-fg shadow-[0_18px_50px_-12px_rgb(7_14_23/0.35)] animate-[fade-in_0.14s_ease-out] ${menuClassName}`}
          >
            <ScrollArea
              className="flex flex-col"
              viewportClassName="p-1.5"
              viewportProps={{ style: { maxHeight: position.maxHeight } }}
            >
              <ul
                id={listId}
                role="listbox"
                aria-labelledby={ariaLabelledBy || baseId}
                tabIndex={-1}
              >
                {options.map((option, index) => {
                  const isSelected = index === selectedIndex;
                  const isActive = index === activeIndex;
                  return (
                    <li
                      key={`${option.value}-${index}`}
                      id={`${baseId}-opt-${index}`}
                      data-index={index}
                      role="option"
                      aria-selected={isSelected}
                      aria-disabled={option.disabled || undefined}
                      onPointerEnter={() => !option.disabled && setActiveIndex(index)}
                      onClick={() => choose(index)}
                      className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-[15px] ${
                        option.disabled ? "cursor-not-allowed opacity-40" : ""
                      } ${isActive ? "bg-raised" : ""} ${isSelected ? "font-medium text-fg" : "text-fg/85"}`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate">{option.label}</span>
                        {option.hint && (
                          <span className="block truncate text-xs text-muted">{option.hint}</span>
                        )}
                      </span>
                      {isSelected && (
                        <PiCheck className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                      )}
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          </div>,
          document.body
        )}
    </>
  );
};

export default Select;
