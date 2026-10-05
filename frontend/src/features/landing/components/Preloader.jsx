import { useEffect, useRef, useState } from 'react';
import './preloader.css';

const KEY = 'fincrm_seen';

export default function Preloader({ onFinish }) {
  const [visible, setVisible] = useState(true);
  const finishedRef = useRef(false);

  useEffect(() => {
    let seen = false;

    try {
      seen = sessionStorage.getItem(KEY) === '1';
    } catch {
      seen = false;
    }

    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (seen || reduced) {
      setVisible(false);

      if (!finishedRef.current) {
        finishedRef.current = true;
        onFinish?.();
      }

      return undefined;
    }

    const timer = window.setTimeout(() => {
      try {
        sessionStorage.setItem(KEY, '1');
      } catch {
        // No hacer nada si sessionStorage está bloqueado.
      }

      setVisible(false);

      if (!finishedRef.current) {
        finishedRef.current = true;
        onFinish?.();
      }
    }, 1500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [onFinish]);

  if (!visible) {
    return null;
  }

  return (
    <div className="preloader" aria-hidden="true">
      <div className="preloader__inner">
        <svg
          className="preloader__mark"
          viewBox="0 0 120 140"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            className="preloader__bar preloader__bar--1"
            x="10"
            y="70"
            width="30"
            height="60"
            rx="8"
            fill="#F97316"
          />

          <rect
            className="preloader__bar preloader__bar--2"
            x="45"
            y="40"
            width="30"
            height="90"
            rx="8"
            fill="#06B6D4"
          />

          <rect
            className="preloader__bar preloader__bar--3"
            x="80"
            y="10"
            width="30"
            height="120"
            rx="8"
            fill="#F8FAFC"
          />

          <path
            className="preloader__arrow-path"
            d="M5 100 L40 60 L70 80 L115 20"
            fill="none"
            stroke="#06B6D4"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <span className="preloader__word">
          FinCRM
        </span>
      </div>
    </div>
  );
}