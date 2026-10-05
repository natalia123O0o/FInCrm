import ModuleCard from './ModuleCard.jsx';
import { MODULES } from '../data/modules.data.js';

export default function ModuleGrid({ onOpen }) {
  return (
    <div className="modules__grid">
      {MODULES.map((m) => (
        <ModuleCard key={m.id} module={m} onOpen={onOpen} />
      ))}
    </div>
  );
}