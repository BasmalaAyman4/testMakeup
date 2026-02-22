"use client";

import Link from "next/link";
import Image from "next/image";
import styles from "./ShopByCategory.module.css";

/**
 * Horizontal "Shop by Category" strip: product type cards with image + label.
 * Selected state uses primary accent. Used on category page (Luxe-style layout).
 */
export default function ShopByCategory({
  productTypes,
  selectedProductTypeId,
  locale,
  categorySlug,
}) {
  if (!productTypes?.length) return null;

  return (
    <section className={styles.section} aria-label="Shop by category">
      <h2 className={styles.title}>Shop by Category</h2>
      <div className={styles.cardsWrap}>
        {productTypes.map((pt) => {
          const productTypeIdStr = String(pt.productTypeId);
          const isSelected = productTypeIdStr === selectedProductTypeId;
          const firstBrand = pt.brands?.[0];
          const href = firstBrand
            ? `/${locale}/category/${categorySlug}?productType=${productTypeIdStr}&brand=${firstBrand.brandId}`
            : `/${locale}/category/${categorySlug}?productType=${productTypeIdStr}`;

          return (
            <Link
              key={pt.productTypeId}
              href={href}
              className={`${styles.card} ${isSelected ? styles.selected : ""}`}
              aria-current={isSelected ? "true" : undefined}
            >
              <div className={styles.cardImageWrap}>
                {pt.imageUrl ? (
                  <Image
                    src={pt.imageUrl}
                    alt=""
                    fill
                    sizes="80px"
                    className={styles.cardImage}
                  />
                ) : (
                  <div className={styles.cardImagePlaceholder} />
                )}
              </div>
              <span className={styles.cardLabel}>{pt.productTypeName}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
