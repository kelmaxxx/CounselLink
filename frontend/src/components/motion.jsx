// src/components/motion.jsx
// Shared entrance motion: page transitions, staggered card grids, count-up numbers.
import React from "react";
import { animate, motion, useReducedMotion } from "framer-motion";
import { formatCount, parseCount } from "../utils/countUp";

const EASE = [0.22, 1, 0.36, 1];
// Expo-out: fast start, long settle — reads as "weight" on counters, and the
// Linear/Apple curve for title characters and page content.
export const KINETIC_EASE = [0.16, 1, 0.3, 1];
const COUNTER_EASE = KINETIC_EASE;

// JSX member tags (`motion.div`) aren't counted as a variable use by the lint
// config, so hold the component in an uppercase const.
const MotionDiv = motion.div;

// Vertical clipping mask for one character. The padding keeps descenders
// (g, y, p) visible once the character has landed.
const MASK_STYLE = {
  display: "inline-block",
  overflow: "hidden",
  paddingBottom: "0.08em",
  // Cancel the padding's layout height so the mask doesn't push the subtitle
  // down; the padding still lets descenders show inside the clip.
  marginBottom: "-0.08em",
};

// Motion children inside <Stagger> pick this up automatically.
export const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
};

// Wrap a grid/list once; direct motion children (BigStat, StatCard) fade in
// together with the page title. Pass `stagger` only when a sequence is wanted.
export function Stagger({ children, className = "", delay = 0, stagger = 0, ...rest }) {
  const reduce = useReducedMotion();
  return (
    <MotionDiv
      className={className}
      initial={reduce ? false : "hidden"}
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: stagger, delayChildren: delay } },
      }}
      {...rest}
    >
      {children}
    </MotionDiv>
  );
}

// Row-level entrance for tables/lists. Rows animate on mount, so switching a
// tab/filter (new rows) replays it without any extra state.
const rowItem = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: EASE } },
};

const MotionTr = motion.tr;

export function TableRow({ index = 0, children, ...rest }) {
  return (
    <MotionTr
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: EASE, delay: Math.min(index * 0.03, 0.36) }}
      {...rest}
    >
      {children}
    </MotionTr>
  );
}

export function ListItem({ children, ...rest }) {
  return (
    <MotionDiv variants={rowItem} {...rest}>
      {children}
    </MotionDiv>
  );
}

// Wrap mobile card lists in <Stagger> so ListItem rows fade in one by one.

export function PageTransition({ children, className = "" }) {
  const reduce = useReducedMotion();
  return (
    <MotionDiv
      className={className}
      initial={reduce ? false : "hidden"}
      animate="show"
      variants={{
        hidden: { opacity: 0, y: 8 },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: reduce ? 0 : 0.5, ease: KINETIC_EASE },
        },
      }}
    >
      {children}
    </MotionDiv>
  );
}

/**
 * Splits a title into words, then characters, so words wrap naturally while
 * each character still slides up out of its own clipping mask.
 *
 * @param {Object} props
 * @param {string} props.text
 * @param {number} [props.staggerDelay=0.022] Seconds between character starts.
 * @param {number} [props.duration=0.42] Seconds per character travel.
 * @param {"up"|"down"} [props.direction="up"] Entry from below (exit to above) or the reverse.
 * @param {string} [props.className]
 */
export function SplitText({
  text,
  staggerDelay = 0.022,
  duration = 0.42,
  direction = "up",
  className = "",
}) {
  const reduce = useReducedMotion();
  const sign = direction === "down" ? -1 : 1;
  const words = String(text).split(" ");
  let charIndex = 0;

  return (
    <span className={className} aria-hidden="true">
      {words.map((word, wordIndex) => (
        <React.Fragment key={wordIndex}>
          <span className="inline-block whitespace-nowrap">
            {Array.from(word).map((char) => {
              const index = charIndex++;
              return (
                <span key={index} style={MASK_STYLE}>
                  <motion.span
                    className="kinetic-char"
                    style={{ display: "inline-block" }}
                    initial={reduce ? false : { y: `${sign * 110}%` }}
                    animate={{ y: "0%" }}
                    exit={{ y: `${-sign * 110}%` }}
                    transition={{ duration, ease: KINETIC_EASE, delay: index * staggerDelay }}
                  >
                    {char}
                  </motion.span>
                </span>
              );
            })}
          </span>
          {wordIndex < words.length - 1 && " "}
        </React.Fragment>
      ))}
    </span>
  );
}

// Counts numeric values up from their previous value (0 on first render).
export function CountUp({ value, duration = 1.1 }) {
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
      ease: COUNTER_EASE,
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
