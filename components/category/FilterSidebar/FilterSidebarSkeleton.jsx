// components/category/FilterSidebar/FilterSidebarSkeleton.jsx
import styles from './FilterSidebar.module.css';
import skeletonStyles from './FilterSidebarSkeleton.module.css';

export default function FilterSidebarSkeleton() {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <div className={`${skeletonStyles.skeleton} ${skeletonStyles.skeletonTitle}`}></div>
      </div>

      <div className={styles.filterGroup}>
        <div className={`${skeletonStyles.skeleton} ${skeletonStyles.skeletonFilterTitle}`}></div>
        
        <div className={styles.productTypeList}>
          {[1, 2, 3, 4].map((index) => (
            <div key={index} className={styles.productTypeItem}>
              <div className={styles.productTypeHeader}>
                <div className={styles.productTypeInfo}>
                  <div className={`${styles.filterImage} ${skeletonStyles.skeleton}`}></div>
                  <div className={`${skeletonStyles.skeleton} ${skeletonStyles.skeletonText}`}></div>
                </div>
                <div className={`${skeletonStyles.skeleton} ${skeletonStyles.skeletonIcon}`}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}