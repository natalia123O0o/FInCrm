import './marquee.css';

const WORDS = [
  'Facturación electrónica DIAN',
  'Ley 2300',
  'RNE',
  'Chatbot IA',
  'Flujo de caja',
  'Cartera',
  'Bitácora auditable',
];

const COLORS = [
  '#F97316',
  '#06B6D4',
  '#0284C7',
];

export default function Marquee() {
  return (
    <section
      className="marquee"
      aria-hidden="true"
    >
      <div className="marquee__track">
        {[0, 1].map((copy) => (
          <ul
            className="marquee__list"
            key={copy}
          >
            {WORDS.map((word, index) => (
              <li
                key={`${copy}-${word}`}
                className="marquee__item"
              >
                <span
                  className="marquee__dot"
                  style={{
                    background:
                      COLORS[index % COLORS.length],
                  }}
                />

                <span>{word}</span>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </section>
  );
}