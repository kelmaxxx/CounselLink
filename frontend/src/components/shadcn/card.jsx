// Minimal shadcn-style Card primitives.
// Styled to match the existing design system (SectionCard):
// white, rounded-2xl, subtle ring — so the shadcn structure
// doesn't change the app's look.
export function Card({ className = "", children }) {
  return (
    <div
      className={`bg-white rounded-2xl shadow-sm ring-1 ring-gray-950/5 ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className = "", children }) {
  return (
    <div
      className={`flex flex-col gap-1.5 px-5 py-4 border-b border-gray-100 ${className}`}
    >
      {children}
    </div>
  );
}

export function CardTitle({ className = "", children }) {
  return (
    <h3 className={`text-base font-semibold text-gray-900 ${className}`}>
      {children}
    </h3>
  );
}

export function CardDescription({ className = "", children }) {
  return (
    <p className={`text-xs text-gray-500 ${className}`}>{children}</p>
  );
}

export function CardContent({ className = "", children }) {
  return <div className={`px-5 py-4 ${className}`}>{children}</div>;
}

export function CardFooter({ className = "", children }) {
  return (
    <div className={`px-5 py-4 border-t border-gray-100 ${className}`}>
      {children}
    </div>
  );
}
