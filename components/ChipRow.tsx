import { useState } from 'react';
import { Chip } from '@/lib/chips';
import styles from './ChipRow.module.css';

export default function ChipRow({ 
  chips, 
  selectedChips, 
  onToggle 
}: { 
  chips: Chip[], 
  selectedChips: string[], 
  onToggle: (label: string) => void 
}) {
  const [expanded, setExpanded] = useState(false);
  
  if (chips.length === 0 && selectedChips.length === 0) return null;

  const visibleChips = expanded ? chips : chips.slice(0, 8);
  const hiddenCount = chips.length - 8;

  return (
    <div className={styles.chipRow}>
      {selectedChips.map(label => (
        <button 
          key={label} 
          className={`${styles.chip} ${styles.selected}`}
          onClick={() => onToggle(label)}
        >
          ✓ {label}
        </button>
      ))}
      
      {visibleChips.map(chip => (
        <button 
          key={chip.label} 
          className={styles.chip}
          onClick={() => onToggle(chip.label)}
        >
          {chip.label} <span className={styles.count}>{chip.matchCount}</span>
        </button>
      ))}

      {hiddenCount > 0 && (
        <button 
          className={styles.toggleBtn}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Show fewer' : `+${hiddenCount} more`}
        </button>
      )}
    </div>
  );
}
