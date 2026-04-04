"use client";

import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { Search } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "~/lib/utils";

/* ── Command Root ── */

const Command = React.forwardRef<
  React.ComponentRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn(
      "flex h-full w-full flex-col overflow-hidden rounded-card bg-bg-primary text-text-primary",
      className,
    )}
    {...props}
  />
));
Command.displayName = "Command";

/* ── Command Input ── */

const CommandInput = React.forwardRef<
  React.ComponentRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => (
  <div className="flex items-center gap-2 border-b border-border px-4">
    <Search className="h-4 w-4 shrink-0 text-text-tertiary" />
    <CommandPrimitive.Input
      ref={ref}
      className={cn(
        "flex h-12 w-full bg-transparent py-3 text-sm",
        "text-text-primary placeholder:text-text-tertiary",
        "outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  </div>
));
CommandInput.displayName = "CommandInput";

/* ── Command List ── */

const CommandList = React.forwardRef<
  React.ComponentRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn(
      "max-h-[300px] overflow-y-auto overflow-x-hidden p-1",
      className,
    )}
    {...props}
  />
));
CommandList.displayName = "CommandList";

/* ── Command Empty ── */

const CommandEmpty = React.forwardRef<
  React.ComponentRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => (
  <CommandPrimitive.Empty
    ref={ref}
    className="py-6 text-center text-sm text-text-secondary"
    {...props}
  />
));
CommandEmpty.displayName = "CommandEmpty";

/* ── Command Group ── */

const CommandGroup = React.forwardRef<
  React.ComponentRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn(
      "overflow-hidden p-1",
      "[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-text-tertiary",
      className,
    )}
    {...props}
  />
));
CommandGroup.displayName = "CommandGroup";

/* ── Command Separator ── */

const CommandSeparator = React.forwardRef<
  React.ComponentRef<typeof CommandPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 h-px bg-border", className)}
    {...props}
  />
));
CommandSeparator.displayName = "CommandSeparator";

/* ── Command Item ── */

const CommandItem = React.forwardRef<
  React.ComponentRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item> & {
    shortcut?: string;
  }
>(({ className, shortcut, children, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center gap-2 rounded-lg px-3 py-2 text-sm",
      "text-text-primary outline-none",
      "data-[selected=true]:bg-bg-hover data-[selected=true]:text-text-primary",
      "data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50",
      "transition-colors duration-fast",
      className,
    )}
    {...props}
  >
    <span className="flex-1">{children}</span>
    {shortcut && (
      <kbd className="ml-auto inline-flex h-5 items-center gap-0.5 rounded border border-border bg-bg-secondary px-1.5 text-[10px] font-medium text-text-tertiary">
        {shortcut}
      </kbd>
    )}
  </CommandPrimitive.Item>
));
CommandItem.displayName = "CommandItem";

/* ── Command Palette (Cmd+K overlay) ── */

interface CommandPaletteProps {
  children: React.ReactNode;
}

function CommandPalette({ children }: CommandPaletteProps) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          {/* Palette */}
          <motion.div
            className={cn(
              "fixed left-1/2 top-[20%] z-50 w-full max-w-lg",
              "rounded-card border border-border bg-bg-primary",
              "shadow-modal overflow-hidden",
            )}
            initial={{ opacity: 0, scale: 0.95, x: "-50%" }}
            animate={{ opacity: 1, scale: 1, x: "-50%" }}
            exit={{ opacity: 0, scale: 0.95, x: "-50%" }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            role="dialog"
            aria-label="Command palette"
          >
            <Command>{children}</Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandPalette,
};
