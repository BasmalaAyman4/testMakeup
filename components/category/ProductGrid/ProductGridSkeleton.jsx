// components/category/ProductGrid/ProductGridSkeleton.jsx
import styles from './ProductGrid.module.css';
import cardStyles from '@/components/ui/Card/card.module.css';
import skeletonStyles from './ProductGridSkeleton.module.css';

function CardSkeleton() {
  return (
    <div className={cardStyles.cardContainer}>
      <div className={cardStyles.card}>
        <div className={cardStyles.card__content}>
          {/* Image skeleton */}
          <div className={`${cardStyles.card__image} ${skeletonStyles.skeleton} ${skeletonStyles.skeletonImage}`}></div>
          
          {/* Text skeleton */}
          <div className={cardStyles.card__text}>
            <div className={`${skeletonStyles.skeleton} ${skeletonStyles.skeletonTitle}`}></div>
          </div>
          
          {/* Footer skeleton */}
          <div className={cardStyles.card__footer}>
            <div className={`${skeletonStyles.skeleton} ${skeletonStyles.skeletonPrice}`}></div>
            <div className={`${skeletonStyles.skeleton} ${skeletonStyles.skeletonButton}`}></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductGridSkeleton({ count = 12 }) {
  return (
    <div className={styles.grid}>
      {Array.from({ length: count }).map((_, index) => (
        <CardSkeleton key={index} />
      ))}
    </div>
  );
}