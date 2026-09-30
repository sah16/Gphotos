import styles from './ResultCountLine.module.css';

export default function ResultCountLine({ count, cluesCount, onClearClues }: { count: number, cluesCount: number, onClearClues: () => void }) {
  if (cluesCount === 0) {
    return (
      <div className={styles.resultCountLine}>
        {count} {count === 1 ? 'loosely matching result' : 'loosely matching results'}
      </div>
    );
  }

  return (
    <div className={styles.resultCountLine}>
      Re-searched with {cluesCount} {cluesCount === 1 ? 'clue' : 'clues'}: {count} {count === 1 ? 'result' : 'results'}
      <button className={styles.clearBtn} onClick={onClearClues}>Clear clues</button>
    </div>
  );
}
