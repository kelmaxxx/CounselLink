// src/components/motion.jsx
// Shared entrance motion: page transitions, staggered card grids, count-up numbers.
import React from "react";
import { animate, motion, useReducedMotion } from "framer-motion";
import { formatCount, parseCount } from "../utils/countUp";

const EASE = [0.22, 1, 0.36, 1];
// JSX member tags (`motion.div`) aren't counted as a variable use by the lint
// config, so hold the component in an uppercase const.
const MotionDiv = motion.div;

// Motion children inside <Stagger> pick this up automatically.
export const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
};

// Wrap a grid/list once; direct motion children (BigStat, StatCard) fade in one
// after another. Children outside a Stagger stay static, so this is opt-in.
export function Stagger({ children, className = "", delay = 0, ...rest }) {
  const reduce = useReducedMotion();
  return (
    <MotionDiv
      className={className}
      initial={reduce ? false : "hidden"}
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.07, delayChildren: delay } },
      }}
      {...rest}
    >
      {children}
    </MotionDiv>
  );
}

// Enter-only transition for route content; the sidebar/header stay put like an
// app shell. Exit is skipped on purpose (needs AnimatePresence around Routes).
export function PageTransition({ children, className = "" }) {
  const reduce = useReducedMotion();
  return (
    <MotionDiv
      className={className}
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
    >
      {children}
    </MotionDiv>
  );
}

// Counts numeric values up from their previous value (0 on first render).
export function CountUp({ value, duration = 0.9 }) {
  const reduce = useReducedMotion();
  const parsed = parseCount(value);
  const target = parsed?.target ?? null;

  const from = React.useRef(0);
  const [shown, setShown] = React.useState(0);

  React.useEffect(() => {
    if (target === null) return;
    if (reduce) {
      from.current = target;
      setShown(target);
      return;
    }
    // Keep `from` on the last painted value so StrictMode's double-run and
    // late-arriving data both continue from where the number already is.
    const controls = animate(from.current, target, {
      duration,
      ease: "easeOut",
      onUpdate: (n) => {
        from.current = n;
        setShown(n);
      },
    });
    return () => controls.stop();
  }, [target, reduce, duration]);

  if (!parsed) return <>{value}</>;
  return (
    <>
      {parsed.prefix}
      {formatCount(shown, parsed)}
      {parsed.suffix}
    </>
  );
}
