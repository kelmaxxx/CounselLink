// shadcn/ui Select API without @radix-ui — custom popover version
// so the dropdown menu can be styled (dark menu + check mark on the
// active item, like the shadcn reference). Same JSX shape:
//
//   <Select value onValueChange>
//     <SelectTrigger><SelectValue placeholder /></SelectTrigger>
//     <SelectContent>
//       <SelectItem value>Label</SelectItem>
//     </SelectContent>
//   </Select>
import React from "react";
import { Check, ChevronDown } from "lucide-react";

function collectItems(children) {
  const items = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    if (child.type === SelectItem) {
      items.push(child.props);
      return;
    }
    if (child.props?.children) {
      items.push(...collectItems(child.props.children));
    }
  });
  return items;
}

function findClass(children, target) {
  let found = "";
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    if (child.type === target && child.props?.className) {
      found += ` ${child.props.className}`;
      return;
    }
    if (child.props?.children) {
      found += findClass(child.props.children, target);
    }
  });
  return found;
}

function findProp(children, target, prop) {
  let found;
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    if (child.type === target && child.props?.[prop] != null) {
      found = child.props[prop];
      return;
    }
    if (child.props?.children) {
      const nested = findProp(child.props.children, target, prop);
      if (nested != null) found = nested;
    }
  });
  return found;
}

function itemLabel(item) {
  return typeof item.children === "string" ? item.children : String(item.value);
}

export function Select({
  value,
  onValueChange,
  children,
  className = "",
  variant = "default",
}) {
  const items = collectItems(children);
  const triggerClass = findClass(children, SelectTrigger);
  const contentClass = findClass(children, SelectContent);
  const placeholder = findProp(children, SelectValue, "placeholder");
  const isForm = variant === "form";
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open ]);

  const selected = items.find((i) => i.value === value);

  const triggerBase = isForm
    ? "flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-4 text-left text-sm text-gray-900 shadow-sm outline-none transition hover:border-gray-300 focus:border-maroon-500 focus:ring-2 focus:ring-maroon-500/25"
    : "inline-flex h-9 items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white pl-3 pr-2.5 text-sm text-gray-700 shadow-sm outline-none transition hover:border-gray-300 focus:border-maroon-500 focus:ring-2 focus:ring-maroon-500/25";

  return (
    <span ref={ref} className={`relative ${isForm ? "block w-full" : "inline-flex"} ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`${triggerBase} ${triggerClass}`}
      >
        <span className={`truncate ${selected ? "" : "text-gray-400"}`}>
          {selected ? itemLabel(selected) : placeholder || ""}
        </span>
        <ChevronDown
          size={14}
          className={`text-gray-400 transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <span
          role="listbox"
          className={`absolute top-[calc(100%+6px)] z-50 rounded-xl border border-gray-200 bg-white p-1 shadow-xl shadow-gray-950/10 ${
            isForm ? "left-0 right-0 min-w-full max-h-60 overflow-y-auto" : "right-0 min-w-[180px]"
          } ${contentClass}`}
        >
          {items.map((item) => {
            const isActive = item.value === value;
            return (
              <button
                key={item.value}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => {
                  onValueChange?.(item.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition ${
                  isForm ? "text-left whitespace-normal" : "whitespace-nowrap"
                } ${
                  isActive
                    ? "bg-maroon-50 text-maroon-800 font-medium"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <span>{itemLabel(item)}</span>
                {isActive && <Check size={16} className="flex-shrink-0 text-maroon-700" />}
              </button>
            );
          })}
        </span>
      )}
    </span>
  );
}

export function SelectTrigger({ children }) {
  return <>{children}</>;
}

export function SelectValue({ placeholder }) {
  return <span>{placeholder}</span>;
}

export function SelectContent({ children }) {
  return <>{children}</>;
}

export function SelectItem({ children }) {
  // Collected by parent <Select>; kept for API compat.
  return <>{children}</>;
}
