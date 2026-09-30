import styles from './RelatedRow.module.css';

export default function RelatedRow() {
  return (
    <div className={styles.relatedSection}>
      <h3 className={styles.relatedTitle}>Related</h3>
      <div className={styles.relatedRow}>
        <button className={styles.relatedChip}>Jun 11, 2020</button>
        <button className={styles.relatedChip}>Jul 4, 2019</button>
        <button className={styles.relatedChip}>Sep 12, 2021</button>
      </div>
    </div>
  );
}
