"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Image from "next/image";
import { useCallback } from "react";
import styles from "./CategoryBrandBar.module.css";

const GridIcon = () => (
  <svg
    className={styles.gridIcon}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden
  >
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

/**
 * Sticky horizontal brand filter: "All Brands" + circular brand logos.
 * Used on category page (Luxe-style layout). All Brands = first brand in list for URL.
 */
export default function CategoryBrandBar({
  brands = [],
  selectedBrandId,
  selectedProductTypeId,
  locale,
  categorySlug,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const buildUrl = useCallback(
    (brandId) => {
      const params = new URLSearchParams(searchParams);
      params.set("productType", String(selectedProductTypeId));
      if (brandId) params.set("brand", String(brandId));
      params.delete("page");
      return `${pathname}?${params.toString()}`;
    },
    [pathname, searchParams, selectedProductTypeId],
  );

  const handleBrandClick = useCallback(
    (brandId) => {
      router.push(buildUrl(brandId), { scroll: false });
    },
    [router, buildUrl],
  );

  const firstBrandId = brands?.[0]?.brandId ? String(brands[0].brandId) : null;
  const isAllBrandsSelected =
    !selectedBrandId || selectedBrandId === firstBrandId;

  return (
    <section className={styles.wrapper} aria-label="Filter by brand">
      <div className={styles.inner}>
      

        {brands.map((brand) => {
          const brandIdStr = String(brand.brandId);
          const isSelected = brandIdStr === selectedBrandId;

          return (
            <button
              key={brand.brandId}
              type="button"
              onClick={() => handleBrandClick(brand.brandId)}
              className={`${styles.brandItem} ${isSelected ? styles.selected : ""}`}
              aria-pressed={isSelected}
            >
              <div className={styles.brandCircle}>
                {brand.imageUrl ? (
                  <Image
                    src={brand.imageUrl}
                    alt=""
                    fill
                    sizes="56px"
                    className={styles.brandImage}
                  />
                ) : (
                  <span className={styles.brandInitial}>
                    {(brand.brandName || "?").charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <span className={styles.brandLabel} title={brand.brandName}>
                {brand.brandName}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
