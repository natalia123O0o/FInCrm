import { forwardRef } from 'react';
import './totem.css';

const Totem = forwardRef(function Totem(
  { size = 'md', className = '', ariaLabel = 'Tótem FinCRM' },
  ref
) {
  return (
    <div ref={ref} className={`totem totem--${size} ${className}`} aria-label={ariaLabel} role="img">
      <span className="totem__square totem__square--navy" />
      <span className="totem__circle totem__circle--cyan" />
      <span className="totem__square totem__square--orange" />
    </div>
  );
});

export default Totem;