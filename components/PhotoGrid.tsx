import { Photo } from '@/lib/retrieval';
import styles from './PhotoGrid.module.css';

export default function PhotoGrid({ photos }: { photos: Photo[] }) {
  if (photos.length === 0) {
    return <div className={styles.empty}>No photos found.</div>;
  }

  return (
    <div className={styles.grid}>
      {photos.map(photo => (
        <div key={photo.id} className={styles.photoWrapper}>
          <img src={photo.imageUrl} alt={photo.caption} className={styles.photo} />
          {photo.isBestMatch && (
            <div className={styles.bestMatch}>Best match</div>
          )}
        </div>
      ))}
    </div>
  );
}
