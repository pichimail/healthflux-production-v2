"use client";
// ─────────────────────────────────────────────────────────────────────────────
// AdaptiveMenu — unified action / context menu
//
// Desktop  → Radix DropdownMenu (keyboard nav, submenus, collision detection)
// Mobile   → vaul bottom-sheet action list (nested submenu navigation)
//
// Items schema:
//   id?:         string                  unique key (falls back to label)
//   label:       string                  display text
//   description? string                  secondary text
//   icon?:       React.ComponentType     Lucide icon
//   onClick?:    () => void              handler (closes menu automatically)
//   variant?:    'default'|'destructive' styling
//   disabled?:   boolean
//   hidden?:     boolean                 remove from list
//   loading?:    boolean                 replaces icon with spinner
//   separator?:  boolean                 renders divider BEFORE this item
//   subItems?:   MenuItem[]              nested submenu
// ─────────────────────────────────────────────────────────────────────────────

import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Drawer as DrawerPrimitive } from "vaul";
import {
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useBottomSheet } from "@/lib/BottomSheetContext";
import Haptics from "@/components/utils/haptics";

// ── Shared item renderer helpers ──────────────────────────────────────────────
function itemVariantStyles(variant) {
  if (variant === "destructive") {
    return { color: "var(--hf-coral-strong)" };
  }
  return { color: "var(--hf-text)" };
}

// ── Desktop: Radix DropdownMenu ───────────────────────────────────────────────
function DesktopMenu({
  trigger,
  items,
  align = "end",
  sideOffset = 6,
  title,
  open,
  onOpenChange,
}) {
  const visible = items.filter((i) => !i.hidden);

  const renderItem = (item) => {
    if (item.separator) {
      return (
        <React.Fragment key={`sep-${item.id ?? item.label}`}>
          <DropdownMenuPrimitive.Separator
            className="my-1 h-px"
            style={{ background: "var(--hf-border)" }}
          />
          <DropdownMenuItemRow item={item} />
        </React.Fragment>
      );
    }
    if (item.subItems?.length) {
      return (
        <DropdownMenuPrimitive.Sub key={item.id ?? item.label}>
          <DropdownMenuPrimitive.SubTrigger
            disabled={item.disabled}
            className={cn(
              "flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm outline-none cursor-pointer",
              "transition-colors duration-100",
              "focus:bg-white/8 data-[highlighted]:bg-white/8",
              item.disabled && "opacity-40 pointer-events-none",
            )}
            style={itemVariantStyles(item.variant)}
          >
            {item.loading ? (
              <Loader2
                className="h-4 w-4 flex-shrink-0 animate-spin"
                style={{ color: "var(--hf-text-muted)" }}
              />
            ) : item.icon ? (
              <item.icon
                className="h-4 w-4 flex-shrink-0"
                style={itemVariantStyles(item.variant)}
              />
            ) : (
              <span className="w-4 flex-shrink-0" />
            )}
            <span className="flex-1 font-medium">{item.label}</span>
            <ChevronRight
              className="h-3.5 w-3.5 ml-auto flex-shrink-0 opacity-50"
            />
          </DropdownMenuPrimitive.SubTrigger>
          <DropdownMenuPrimitive.Portal>
            <DropdownMenuPrimitive.SubContent
              className={cn(
                "z-[220] min-w-[10rem] rounded-xl p-1.5 overflow-hidden",
                "data-[state=open]:animate-in data-[state=closed]:animate-out",
                "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
                "data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2",
              )}
              style={{
                background: "var(--hf-panel-strong)",
                border: "1px solid var(--hf-border)",
                boxShadow: "var(--hf-shadow)",
                backdropFilter: "blur(30px) saturate(150%)",
                WebkitBackdropFilter: "blur(30px) saturate(150%)",
              }}
              sideOffset={2}
              alignOffset={-4}
            >
              {item.subItems.filter((s) => !s.hidden).map((sub) => (
                <DropdownMenuItemRow key={sub.id ?? sub.label} item={sub} />
              ))}
            </DropdownMenuPrimitive.SubContent>
          </DropdownMenuPrimitive.Portal>
        </DropdownMenuPrimitive.Sub>
      );
    }
    return <DropdownMenuItemRow key={item.id ?? item.label} item={item} />;
  };

  return (
    <DropdownMenuPrimitive.Root
      open={open}
      onOpenChange={onOpenChange}
    >
      <DropdownMenuPrimitive.Trigger asChild>
        {trigger}
      </DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align={align}
          sideOffset={sideOffset}
          className={cn(
            "z-[220] min-w-[10rem] rounded-xl p-1.5 overflow-hidden",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
            "data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2",
          )}
          style={{
            background: "var(--hf-panel-strong)",
            border: "1px solid var(--hf-border)",
            boxShadow: "var(--hf-shadow)",
            backdropFilter: "blur(30px) saturate(150%)",
            WebkitBackdropFilter: "blur(30px) saturate(150%)",
          }}
          collisionPadding={8}
          avoidCollisions
        >
          {title && (
            <>
              <div
                className="px-3 py-2 text-xs font-bold uppercase tracking-wider"
                style={{ color: "var(--hf-text-muted)" }}
              >
                {title}
              </div>
              <DropdownMenuPrimitive.Separator
                className="mb-1 h-px"
                style={{ background: "var(--hf-border)" }}
              />
            </>
          )}
          {visible.map(renderItem)}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}

function DropdownMenuItemRow({ item }) {
  return (
    <DropdownMenuPrimitive.Item
      disabled={item.disabled || item.loading}
      onSelect={(e) => {
        if (!item.onClick) return;
        e.preventDefault();
        item.onClick();
      }}
      className={cn(
        "flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm outline-none cursor-pointer",
        "transition-colors duration-100",
        "focus:bg-white/8 data-[highlighted]:bg-white/8",
        item.disabled && "opacity-40 pointer-events-none",
      )}
      style={itemVariantStyles(item.variant)}
    >
      {item.loading ? (
        <Loader2
          className="h-4 w-4 flex-shrink-0 animate-spin"
          style={{ color: "var(--hf-text-muted)" }}
        />
      ) : item.icon ? (
        <item.icon
          className="h-4 w-4 flex-shrink-0"
          style={itemVariantStyles(item.variant)}
        />
      ) : (
        <span className="w-4 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <span className="font-medium">{item.label}</span>
        {item.description && (
          <p
            className="text-xs mt-0.5 truncate"
            style={{ color: "var(--hf-text-muted)" }}
          >
            {item.description}
          </p>
        )}
      </div>
      {item.checked !== undefined && item.checked && (
        <Check
          className="h-3.5 w-3.5 ml-auto flex-shrink-0"
          style={{ color: "var(--hf-lemon)" }}
        />
      )}
    </DropdownMenuPrimitive.Item>
  );
}

// ── Mobile: vaul bottom-sheet action list ─────────────────────────────────────
function MobileMenu({
  trigger,
  items,
  title,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange : setInternalOpen;

  // Submenu navigation stack: [{title, items}]
  const [stack, setStack] = React.useState([]);
  const { openSheet, closeSheet } = useBottomSheet();

  const currentTitle =
    stack.length > 0 ? stack[stack.length - 1].title : title;
  const currentItems = (
    stack.length > 0 ? stack[stack.length - 1].items : items
  ).filter((i) => !i.hidden);

  const handleOpen = (v) => {
    if (!v) setStack([]); // reset nav on close
    setOpen(v);
    if (v) Haptics.light();
  };

  React.useEffect(() => {
    if (!open) return undefined;
    openSheet();
    return () => closeSheet();
  }, [open, openSheet, closeSheet]);

  const handleItem = (item) => {
    if (item.disabled || item.loading) return;
    if (item.subItems?.length) {
      Haptics.light();
      setStack((s) => [...s, { title: item.label, items: item.subItems }]);
      return;
    }
    Haptics.medium();
    item.onClick?.();
    handleOpen(false);
  };

  const handleBack = () => {
    Haptics.light();
    setStack((s) => s.slice(0, -1));
  };

  return (
    <>
      {/* Trigger: clone to add onPress handler */}
      {React.isValidElement(trigger)
        ? React.cloneElement(trigger, {
            onClick: (e) => {
              trigger.props.onClick?.(e);
              handleOpen(true);
            },
          })
        : trigger}

      <DrawerPrimitive.Root
        open={open}
        onOpenChange={handleOpen}
        snapPoints={[0.5]}
        shouldScaleBackground={false}
      >
        <DrawerPrimitive.Portal>
          <DrawerPrimitive.Overlay
            className="fixed inset-0 z-[200]"
            style={{
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(2px)",
              WebkitBackdropFilter: "blur(2px)",
            }}
          />
          <DrawerPrimitive.Content
            className="fixed inset-x-0 bottom-0 z-[210] flex flex-col outline-none rounded-t-[24px] border-t"
            style={{
              background: "var(--hf-panel-strong)",
              borderColor: "var(--hf-border)",
              maxHeight: "60dvh",
              backdropFilter: "blur(30px) saturate(150%)",
              WebkitBackdropFilter: "blur(30px) saturate(150%)",
            }}
          >
            {/* Drag handle */}
            <div
              className="mx-auto mt-3 mb-0 h-1.5 w-10 rounded-full flex-shrink-0 pointer-events-none"
              style={{ background: "var(--hf-border-strong)" }}
              aria-hidden="true"
            />

            {/* Header */}
            <div
              className="flex items-center gap-3 px-5 py-3 flex-shrink-0"
              style={{ borderBottom: "1px solid var(--hf-border)" }}
            >
              {stack.length > 0 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0 active-press"
                  style={{ background: "var(--hf-surface-2)" }}
                  aria-label="Go back"
                >
                  <ChevronLeft
                    className="h-5 w-5"
                    style={{ color: "var(--hf-text)" }}
                  />
                </button>
              )}
              <DrawerPrimitive.Title
                className="flex-1 text-base font-bold"
                style={{ color: "var(--hf-text)" }}
              >
                {currentTitle || "Actions"}
              </DrawerPrimitive.Title>
              <button
                type="button"
                onClick={() => handleOpen(false)}
                className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0 active-press opacity-60"
                style={{ background: "var(--hf-surface-2)" }}
                aria-label="Close menu"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  style={{ color: "var(--hf-text)" }}
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <DrawerPrimitive.Description className="sr-only">
              Action menu
            </DrawerPrimitive.Description>

            {/* Action items */}
            <div className="flex-1 overflow-y-auto overscroll-contain py-2 px-3">
              {currentItems.map((item, idx) => (
                <React.Fragment key={item.id ?? item.label ?? idx}>
                  {item.separator && idx > 0 && (
                    <div
                      className="my-1.5 h-px"
                      style={{ background: "var(--hf-border)" }}
                    />
                  )}
                  <button
                    type="button"
                    disabled={item.disabled || item.loading}
                    onClick={() => handleItem(item)}
                    className={cn(
                      "flex items-center gap-3 w-full px-3 py-3 rounded-xl text-left active-press transition-colors",
                      "hover:bg-white/5 focus:outline-none focus-visible:bg-white/5",
                      item.disabled && "opacity-40 pointer-events-none",
                    )}
                  >
                    {/* Icon / spinner */}
                    {item.loading ? (
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: "var(--hf-surface-2)" }}
                      >
                        <Loader2
                          className="h-5 w-5 animate-spin"
                          style={{ color: "var(--hf-text-muted)" }}
                        />
                      </div>
                    ) : item.icon ? (
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{
                          background:
                            item.variant === "destructive"
                              ? "rgba(242,140,140,0.15)"
                              : "var(--hf-surface-2)",
                        }}
                      >
                        <item.icon
                          className="h-5 w-5"
                          style={
                            item.variant === "destructive"
                              ? { color: "var(--hf-coral-strong)" }
                              : { color: "var(--hf-text)" }
                          }
                        />
                      </div>
                    ) : null}

                    {/* Label + description */}
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-semibold truncate"
                        style={
                          item.variant === "destructive"
                            ? { color: "var(--hf-coral-strong)" }
                            : { color: "var(--hf-text)" }
                        }
                      >
                        {item.label}
                      </p>
                      {item.description && (
                        <p
                          className="text-xs mt-0.5 truncate"
                          style={{ color: "var(--hf-text-muted)" }}
                        >
                          {item.description}
                        </p>
                      )}
                    </div>

                    {/* Right: chevron for submenu or check */}
                    {item.subItems?.length ? (
                      <ChevronRight
                        className="h-4 w-4 flex-shrink-0 opacity-40"
                        style={{ color: "var(--hf-text)" }}
                      />
                    ) : item.checked !== undefined && item.checked ? (
                      <Check
                        className="h-4 w-4 flex-shrink-0"
                        style={{ color: "var(--hf-lemon)" }}
                      />
                    ) : null}
                  </button>
                </React.Fragment>
              ))}
            </div>

            {/* Cancel row */}
            <div
              className="px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pt-2 flex-shrink-0"
              style={{ borderTop: "1px solid var(--hf-border)" }}
            >
              <button
                type="button"
                onClick={() => handleOpen(false)}
                className="w-full h-12 rounded-xl text-sm font-semibold active-press transition-colors"
                style={{
                  background: "var(--hf-surface-2)",
                  color: "var(--hf-text)",
                }}
              >
                Cancel
              </button>
            </div>
          </DrawerPrimitive.Content>
        </DrawerPrimitive.Portal>
      </DrawerPrimitive.Root>
    </>
  );
}

// ── Public API ────────────────────────────────────────────────────────────────
/**
 * AdaptiveMenu — action / context menu.
 *
 * Desktop: high-quality Radix DropdownMenu with submenus.
 * Mobile:  vaul bottom-sheet action list with nested navigation.
 *
 * @param {object} props
 * @param {React.ReactElement} props.trigger       The element that opens the menu
 * @param {MenuItem[]} props.items                 Action items
 * @param {string} [props.title]                   Optional menu title
 * @param {'start'|'center'|'end'} [props.align='end']  Desktop alignment
 * @param {number} [props.sideOffset=6]            Desktop gap from trigger
 * @param {boolean} [props.open]                   Controlled open state
 * @param {(open: boolean) => void} [props.onOpenChange]
 */
export function AdaptiveMenu(props) {
  const isMobile = useIsMobile();
  if (isMobile) return <MobileMenu {...props} />;
  return <DesktopMenu {...props} />;
}

export default AdaptiveMenu;
