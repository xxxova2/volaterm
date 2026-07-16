import { useState } from 'react';

interface GlossaryEntry {
  term: string;
  definition: string;
  category: string;
}

interface GlossaryPanelProps {
  entries: GlossaryEntry[];
}

const CATEGORY_LABELS: Record<string, string> = {
  options: 'Options & Greeks',
  macro: 'Macro & Rates',
  // Desk product vocabulary (not an Academy track)
  positioning: 'Desk · Positioning terms',
};

export function GlossaryPanel({ entries }: GlossaryPanelProps) {
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? entries.filter(
        (e) =>
          e.term.toLowerCase().includes(search.toLowerCase()) ||
          e.definition.toLowerCase().includes(search.toLowerCase()),
      )
    : entries;

  const byCategory: Record<string, GlossaryEntry[]> = {};
  for (const e of filtered) {
    (byCategory[e.category] ||= []).push(e);
  }

  return (
    <div className="academy-type" data-testid="academy-glossary">
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search terms…"
        className="academy-glossary-search"
        aria-label="Search glossary"
      />

      {Object.entries(byCategory).map(([cat, items]) => (
        <div key={cat} className="academy-glossary-cat">
          <h3 className="academy-glossary-cat-h">{CATEGORY_LABELS[cat] || cat}</h3>
          <ul className="academy-glossary-list">
            {items.map((e) => (
              <li key={e.term} className="academy-glossary-item">
                <p className="academy-glossary-term">{e.term}</p>
                <p className="academy-glossary-def">{e.definition}</p>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {filtered.length === 0 && (
        <p className="academy-empty">No terms match “{search}”.</p>
      )}
    </div>
  );
}
