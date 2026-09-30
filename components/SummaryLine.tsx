import styles from './SummaryLine.module.css';

export default function SummaryLine({ query, selectedChips }: { query: string, selectedChips: string[] }) {
  return (
    <div className={styles.summaryLine}>
      Searching for: <span className={styles.queryHighlight}>{query}</span>
      {selectedChips.length > 0 && (
        <span className={styles.clues}>
          {' · '}
          {selectedChips.join(' · ')}
        </span>
      )}
    </div>
  );
}
