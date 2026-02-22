"use client";

import { useCallback } from "react";
import styles from "./CategoryToolbar.module.css";

const SORT_OPTIONS = [
  { value: "best-selling", label: "Best Selling" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "newest", label: "New Arrivals" },
];

/**
 * Toolbar above product grid: "X Products found" + Sort dropdown.
 */
export default function CategoryToolbar({
  productTypeName,
  totalCount,
  sortValue = "best-selling",
  onSortChange,
}) {
  const handleChange = useCallback(
    (e) => {
      const value = e.target.value;
      onSortChange?.(value);
    },
    [onSortChange],
  );

  const label = productTypeName
    ? `${totalCount} ${productTypeName} found`
    : `${totalCount} product${totalCount !== 1 ? "s" : ""} found`;

  return (
    <div className={styles.toolbar}>
      <p className={styles.count}>
        <strong>{totalCount}</strong> {productTypeName || "product"}
        {totalCount !== 1 ? "s" : ""} found
      </p>
      <div className={styles.sortWrap}>
        <span className={styles.sortLabel}>Sort by:</span>
        <select
          className={styles.sortSelect}
          value={sortValue}
          onChange={handleChange}
          aria-label="Sort products"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
