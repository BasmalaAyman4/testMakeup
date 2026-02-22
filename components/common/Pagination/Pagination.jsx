// components/ui/Pagination/Pagination.jsx
"use client";

import { useRouter } from "next/navigation";
import styles from "./Pagination.module.css";

export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  onPageChange, // Function that returns the URL for a page
  scrollToTop = true,
  className = "",
  variant, // 'circular' for category/shop style
}) {
  const router = useRouter();

  const handlePageChange = (page) => {
    if (page === currentPage || page < 1 || page > totalPages) return;

    const url =
      typeof onPageChange === "function"
        ? onPageChange(page)
        : onPageChange.replace("{page}", page);

    router.push(url, { scroll: scrollToTop });
  };

  // Generate page numbers with smart ellipsis
  const getPageNumbers = () => {
    const pages = [];
    const showPages = 5;

    if (totalPages <= showPages + 2) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      if (currentPage <= 3) {
        start = 2;
        end = 4;
      } else if (currentPage >= totalPages - 2) {
        start = totalPages - 3;
        end = totalPages - 1;
      }

      if (start > 2) {
        pages.push("start-ellipsis");
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages - 1) {
        pages.push("end-ellipsis");
      }

      pages.push(totalPages);
    }

    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <nav
      className={`${styles.pagination} ${variant === "circular" ? styles.circular : ""} ${className}`}
      aria-label="Pagination"
    >
      {/* Previous Button */}
      <button
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`${styles.navButton} ${currentPage === 1 ? styles.disabled : ""}`}
        aria-label="Previous page"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path
            d="M12.5 15L7.5 10L12.5 5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className={styles.navText}>Previous</span>
      </button>

      {/* Page Numbers */}
      <div className={styles.pageNumbers}>
        {getPageNumbers().map((page, index) => {
          if (typeof page === "string") {
            return (
              <span key={page} className={styles.ellipsis} aria-hidden="true">
                ...
              </span>
            );
          }

          return (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`${styles.pageButton} ${
                currentPage === page ? styles.active : ""
              }`}
              aria-label={`${currentPage === page ? "Current page, " : ""}Page ${page}`}
              aria-current={currentPage === page ? "page" : undefined}
            >
              {page}
            </button>
          );
        })}
      </div>

      {/* Next Button */}
      <button
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`${styles.navButton} ${currentPage === totalPages ? styles.disabled : ""}`}
        aria-label="Next page"
      >
        <span className={styles.navText}>Next</span>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path
            d="M7.5 15L12.5 10L7.5 5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </nav>
  );
}

/* 
USAGE EXAMPLES:

1. Simple URL pattern:
<Pagination 
  currentPage={5}
  totalPages={10}
  onPageChange="/products?page={page}"
/>

2. With function for complex URLs:
<Pagination 
  currentPage={currentPage}
  totalPages={totalPages}
  onPageChange={(page) => `/category/${slug}?productType=${typeId}&brand=${brandId}&page=${page}`}
/>

3. With all options:
<Pagination 
  currentPage={3}
  totalPages={15}
  onPageChange={(page) => generateUrl(page)}
  scrollToTop={false}
  className="my-custom-class"
/>
*/
