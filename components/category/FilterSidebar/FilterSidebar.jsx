/* 'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useState } from 'react';
import styles from './FilterSidebar.module.css';

export default function FilterSidebar({
  productTypes,
  selectedProductTypeId,
  selectedBrandId,
  locale,
  categorySlug,
}) {
  const router = useRouter();
  const [expandedProductType, setExpandedProductType] = useState(selectedProductTypeId);

  const handleProductTypeChange = (productTypeId) => {
    const productType = productTypes.find(pt => String(pt.productTypeId) === String(productTypeId));
    const firstBrand = productType?.brands?.[0];
    
    if (!firstBrand) return;

    const params = new URLSearchParams();
    params.set('productType', String(productTypeId));
    params.set('brand', String(firstBrand.brandId));
    
    router.push(`/${locale}/category/${categorySlug}?${params.toString()}`);
    setExpandedProductType(String(productTypeId));
  };

  const handleBrandChange = (brandId) => {
    const params = new URLSearchParams();
    params.set('productType', selectedProductTypeId);
    params.set('brand', String(brandId));
    
    router.push(`/${locale}/category/${categorySlug}?${params.toString()}`);
  };

  const toggleProductType = (productTypeId) => {
    setExpandedProductType(
      expandedProductType === String(productTypeId) ? null : String(productTypeId)
    );
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <h2 className={styles.title}>Filters</h2>
      </div>

      <div className={styles.filterGroup}>
        <h3 className={styles.filterTitle}>Product Types</h3>
        <div className={styles.productTypeList}>
          {productTypes.map((productType) => {
            const isSelected = String(productType.productTypeId) === selectedProductTypeId;
            const isExpanded = String(productType.productTypeId) === expandedProductType;
            const hasBrands = productType.brands && productType.brands.length > 0;

            return (
              <div key={productType.productTypeId} className={styles.productTypeItem}>
                <div
                  className={`${styles.productTypeHeader} ${isSelected ? styles.selected : ''}`}
                  onClick={() => {
                    if (hasBrands) {
                      if (isSelected) {
                        toggleProductType(productType.productTypeId);
                      } else {
                        handleProductTypeChange(productType.productTypeId);
                      }
                    }
                  }}
                >
                  <div className={styles.productTypeInfo}>
                    <div className={styles.filterImage}>
                      <Image
                        src={productType.imageUrl}
                        alt={productType.productTypeName}
                        width={40}
                        height={40}
                        className={styles.image}
                      />
                    </div>
                    <span className={styles.filterName}>
                      {productType.productTypeName}
                    </span>
                  </div>
                  
                  {hasBrands && (
                    <svg
                      className={`${styles.expandIcon} ${isExpanded ? styles.expanded : ''}`}
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                    >
                      <path
                        d="M4 6L8 10L12 6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>

                {hasBrands && isSelected && isExpanded && (
                  <div className={styles.brandsList}>
                    {productType.brands.map((brand) => {
                      const isBrandSelected = String(brand.brandId) === selectedBrandId;
                      
                      return (
                        <button
                          key={brand.brandId}
                          onClick={() => handleBrandChange(brand.brandId)}
                          className={`${styles.brandItem} ${isBrandSelected ? styles.activeBrand : ''}`}
                        >
                          <div className={styles.brandImage}>
                            <Image
                              src={brand.imageUrl}
                              alt={brand.brandName}
                              width={32}
                              height={32}
                              className={styles.image}
                            />
                          </div>
                          <span className={styles.brandName}>{brand.brandName}</span>
                          {isBrandSelected && (
                            <svg
                              className={styles.checkIcon}
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              fill="none"
                            >
                              <path
                                d="M13.5 4L6 11.5L2.5 8"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
} */
// components/category/FilterSidebar/FilterSidebar.jsx
'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useState, useCallback, useMemo, memo, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './FilterSidebar.module.css';

// Animation variants for smooth transitions
const brandsListVariants = {
  hidden: { 
    height: 0,
    opacity: 0,
    transition: {
      height: { duration: 0.2, ease: 'easeInOut' },
      opacity: { duration: 0.15 }
    }
  },
  visible: { 
    height: 'auto',
    opacity: 1,
    transition: {
      height: { duration: 0.2, ease: 'easeInOut' },
      opacity: { duration: 0.15, delay: 0.05 }
    }
  }
};

const brandItemVariants = {
  hidden: { 
    x: -10, 
    opacity: 0 
  },
  visible: (index) => ({
    x: 0,
    opacity: 1,
    transition: {
      delay: index * 0.03,
      duration: 0.2,
      ease: 'easeOut'
    }
  })
};

const checkIconVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: { 
    scale: 1, 
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 500,
      damping: 25
    }
  }
};

// Memoized Brand Item Component
const BrandItem = memo(({ brand, isSelected, onSelect, index }) => {
  const handleClick = useCallback(() => {
    onSelect(brand.brandId);
  }, [brand.brandId, onSelect]);

  return (
    <motion.button
      custom={index}
      variants={brandItemVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ x: 4, transition: { duration: 0.15 } }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className={`${styles.brandItem} ${isSelected ? styles.activeBrand : ''}`}
      aria-pressed={isSelected}
      type="button"
    >
      <div className={styles.brandImage}>
        <Image
          src={brand.imageUrl}
          alt={brand.brandName}
          width={32}
          height={32}
          className={styles.image}
          loading="lazy"
        />
      </div>
      <span className={styles.brandName}>{brand.brandName}</span>
      <AnimatePresence mode="wait">
        {isSelected && (
          <motion.svg
            key="check"
            variants={checkIconVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className={styles.checkIcon}
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M13.5 4L6 11.5L2.5 8"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.svg>
        )}
      </AnimatePresence>
    </motion.button>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.brand.brandId === nextProps.brand.brandId &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.onSelect === nextProps.onSelect &&
    prevProps.index === nextProps.index
  );
});

BrandItem.displayName = 'BrandItem';

// Memoized Product Type Component
const ProductTypeItem = memo(({ 
  productType, 
  isSelected, 
  isExpanded, 
  selectedBrandId,
  onProductTypeChange,
  onBrandChange,
  onToggle 
}) => {
  const hasBrands = productType.brands && productType.brands.length > 0;

  const handleClick = useCallback(() => {
    if (hasBrands) {
      if (isSelected) {
        onToggle(productType.productTypeId);
      } else {
        onProductTypeChange(productType.productTypeId);
      }
    }
  }, [hasBrands, isSelected, onToggle, onProductTypeChange, productType.productTypeId]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }, [handleClick]);

  // Memoize brands list
  const brandsList = useMemo(() => {
    if (!hasBrands || !isSelected) return null;

    return (
      <AnimatePresence mode="wait">
        {isExpanded && (
          <motion.div
            key="brands-list"
            variants={brandsListVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className={styles.brandsList}
          >
            {productType.brands.map((brand, index) => (
              <BrandItem
                key={brand.brandId}
                brand={brand}
                isSelected={String(brand.brandId) === selectedBrandId}
                onSelect={onBrandChange}
                index={index}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }, [hasBrands, isSelected, isExpanded, productType.brands, selectedBrandId, onBrandChange]);

  return (
    <div className={styles.productTypeItem}>
      <motion.div
        className={`${styles.productTypeHeader} ${isSelected ? styles.selected : ''}`}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onKeyDown={handleKeyDown}
        whileHover={{ backgroundColor: 'rgba(249, 250, 251, 1)' }}
        whileTap={{ scale: 0.98 }}
      >
        <div className={styles.productTypeInfo}>
          <div className={styles.filterImage}>
            <Image
              src={productType.imageUrl}
              alt={productType.productTypeName}
              width={40}
              height={40}
              className={styles.image}
              loading="lazy"
            />
          </div>
          <span className={styles.filterName}>
            {productType.productTypeName}
          </span>
        </div>
        
        {hasBrands && (
          <motion.svg
            className={styles.expandIcon}
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M4 6L8 10L12 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.svg>
        )}
      </motion.div>

      {brandsList}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.productType.productTypeId === nextProps.productType.productTypeId &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isExpanded === nextProps.isExpanded &&
    prevProps.selectedBrandId === nextProps.selectedBrandId &&
    prevProps.onProductTypeChange === nextProps.onProductTypeChange &&
    prevProps.onBrandChange === nextProps.onBrandChange &&
    prevProps.onToggle === nextProps.onToggle
  );
});

ProductTypeItem.displayName = 'ProductTypeItem';

export default function FilterSidebar({
  productTypes,
  selectedProductTypeId,
  selectedBrandId,
  locale,
  categorySlug,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [expandedProductType, setExpandedProductType] = useState(selectedProductTypeId);
  const [isPending, startTransition] = useTransition();

  // Build URL efficiently
  const buildUrl = useCallback((productTypeId, brandId) => {
    const params = new URLSearchParams(searchParams);
    params.set('productType', String(productTypeId));
    if (brandId) {
      params.set('brand', String(brandId));
    }
    params.delete('page');
    return `${pathname}?${params.toString()}`;
  }, [pathname, searchParams]);

  // Use startTransition for smooth updates
  const handleProductTypeChange = useCallback((productTypeId) => {
    const productType = productTypes.find(
      pt => String(pt.productTypeId) === String(productTypeId)
    );
    const firstBrand = productType?.brands?.[0];
    
    if (!firstBrand) return;

    const url = buildUrl(productTypeId, firstBrand.brandId);
    
    startTransition(() => {
      router.push(url, { scroll: false });
      setExpandedProductType(String(productTypeId));
    });
  }, [productTypes, buildUrl, router]);

  const handleBrandChange = useCallback((brandId) => {
    const url = buildUrl(selectedProductTypeId, brandId);
    
    startTransition(() => {
      router.push(url, { scroll: false });
    });
  }, [selectedProductTypeId, buildUrl, router]);

  const toggleProductType = useCallback((productTypeId) => {
    setExpandedProductType(prev => 
      prev === String(productTypeId) ? null : String(productTypeId)
    );
  }, []);

  // Memoize product types list
  const productTypesList = useMemo(() => {
    return productTypes.map((productType) => {
      const productTypeIdStr = String(productType.productTypeId);
      const isSelected = productTypeIdStr === selectedProductTypeId;
      const isExpanded = productTypeIdStr === expandedProductType;

      return (
        <ProductTypeItem
          key={productType.productTypeId}
          productType={productType}
          isSelected={isSelected}
          isExpanded={isExpanded}
          selectedBrandId={selectedBrandId}
          onProductTypeChange={handleProductTypeChange}
          onBrandChange={handleBrandChange}
          onToggle={toggleProductType}
        />
      );
    });
  }, [
    productTypes, 
    selectedProductTypeId, 
    expandedProductType, 
    selectedBrandId,
    handleProductTypeChange,
    handleBrandChange,
    toggleProductType
  ]);

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <h2 className={styles.title}>Filters</h2>
        <AnimatePresence mode="wait">
          {isPending && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={styles.loadingIndicator}
            >
              <motion.span
                className={styles.spinner}
                animate={{ rotate: 360 }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  ease: 'linear'
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className={styles.filterGroup}>
        <h3 className={styles.filterTitle}>Product Types</h3>
        <div className={styles.productTypeList}>
          {productTypesList}
        </div>
      </div>
    </aside>
  );
}