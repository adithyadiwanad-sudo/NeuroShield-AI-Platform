import React, { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

export default function TypewriterText({ text, animate = true }) {
  const reduced = useReducedMotion();
  const [count, setCount] = useState(0);
  useEffect(() => {
    setCount(0);
    if (reduced || !animate) return;
    let position = 0;
    const timer = setInterval(() => {
      position = Math.min(text.length, position + 5);
      setCount(position);
      if (position === text.length) clearInterval(timer);
    }, 24);
    return () => clearInterval(timer);
  }, [text, reduced, animate]);
  return (
    <p className="soc-typewriter">
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {text.slice(0, reduced || !animate ? text.length : count)}
        {!reduced && animate && count < text.length && (
          <span className="soc-caret">▍</span>
        )}
      </span>
    </p>
  );
}
