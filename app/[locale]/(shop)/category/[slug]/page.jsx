/* // app/[locale]/(shop)/category/[slug]/page.jsx
import { notFound, redirect } from 'next/navigation';
import { serverApi } from '@/lib/server-fetch';
import styles from './category.module.css';
import CategoryHeader from '@/components/category/CategoryHeader/CategoryHeader';
import FilterSidebar from '@/components/category/FilterSidebar/FilterSidebar';
import ProductGrid from '@/components/category/ProductGrid/ProductGrid';
import Pagination from '@/components/common/Pagination/Pagination';

// Generate metadata for SEO
export async function generateMetadata({ params }) {
  const { locale, slug } = params;
  const category = await getCategoryBySlug(slug, locale);
  
  if (!category) {
    return { title: 'Category Not Found' };
  }

  return {
    title: `${category.name} | La Jolie`,
    description: `Shop ${category.name} products at La Jolie. Premium quality beauty and skincare products.`,
    openGraph: {
      title: `${category.name} | La Jolie`,
      description: `Shop ${category.name} products at La Jolie`,
      images: [category.imageUrl],
    },
  };
}

// Helper: Get category by slug
async function getCategoryBySlug(slug, locale) {
  const result = await serverApi.get('api/CategoryDetails/category', {
    locale,
    revalidate: 3600,
    tags: ['categories'],
  });

  if (!result.success) return null;

  const categoryName = slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return result.data?.find(
    cat => cat.name.toLowerCase() === categoryName.toLowerCase()
  );
}

// Helper: Get product types and brands
async function getCategoryDetails(categoryId, locale) {
  const result = await serverApi.get(`api/CategoryDetails/${categoryId}`, {
    locale,
    revalidate: 1800,
    tags: [`category-${categoryId}`],
  });

  return result.success ? result.data : [];
}

// Helper: Get products with pagination info
async function getProducts(productTypeId, brandId, pageNo, locale) {
  const pageSize = 20;
  const endpoint = `api/CategoryDetails?productTypeId=${productTypeId}&brandId=${brandId}&pageNo=${pageNo}&pageSize=${pageSize}`;

  const result = await serverApi.get(endpoint, {
    locale,
    revalidate: 300,
    tags: [`products-${productTypeId}-${brandId}`],
  });

  if (!result.success) return { products: [], totalCount: 0 };

  // Assuming API returns products array and totalCount
  // Adjust based on your actual API response structure
  return {
    products: result.data || [],
    totalCount: result.totalCount || result.data?.length || 0,
  };
}

export default async function CategoryPage({ params, searchParams }) {
  const { locale, slug } = params;
  const { productType, brand, page = '1' } = searchParams;

  // Get category
  const category = await getCategoryBySlug(slug, locale);
  if (!category) notFound();

  // Get product types and brands
  const categoryDetails = await getCategoryDetails(category.id, locale);
  if (!categoryDetails || categoryDetails.length === 0) {
    return (
      <div className={styles.container}>
        <CategoryHeader category={category} productsCount={0} />
        <p className={styles.emptyState}>No products available</p>
      </div>
    );
  }

  // Auto-select first product type and brand if not provided
  const firstProductType = categoryDetails[0];
  const selectedProductTypeId = productType || String(firstProductType.productTypeId);
  
  // Find the selected product type data
  const selectedProductType = categoryDetails.find(
    pt => String(pt.productTypeId) === selectedProductTypeId
  ) || firstProductType;

  const firstBrand = selectedProductType.brands?.[0];
  const selectedBrandId = brand || (firstBrand ? String(firstBrand.brandId) : null);

  // Redirect to URL with default filters if not present
  if (!productType || !brand) {
    const params = new URLSearchParams();
    params.set('productType', selectedProductTypeId);
    if (selectedBrandId) params.set('brand', selectedBrandId);
    if (page !== '1') params.set('page', page);
    
    redirect(`/${locale}/category/${slug}?${params.toString()}`);
  }

  // Get products
  const { products, totalCount } = await getProducts(
    selectedProductTypeId,
    selectedBrandId,
    parseInt(page),
    locale
  );

  const pageSize = 20;
  const totalPages = Math.ceil(totalCount / pageSize);
  const currentPage = parseInt(page);

  return (
    <div className={styles.container}>
      <CategoryHeader 
        category={category}
        productsCount={totalCount}
      />

      <div className={styles.content}>
        <FilterSidebar
          productTypes={categoryDetails}
          selectedProductTypeId={selectedProductTypeId}
          selectedBrandId={selectedBrandId}
          locale={locale}
          categorySlug={slug}
        />

        <main className={styles.main}>
          {products.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No products found with the selected filters</p>
            </div>
          ) : (
            <>
              <ProductGrid products={products} locale={locale} />
              
              {totalPages > 1 && (
                <Pagination 
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={(newPage) => {
                    const params = new URLSearchParams();
                    params.set('productType', selectedProductTypeId);
                    if (selectedBrandId) params.set('brand', selectedBrandId);
                    if (newPage !== 1) params.set('page', String(newPage));
                    return `/${locale}/category/${slug}?${params.toString()}`;
                  }}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
} */
// app/[locale]/(shop)/category/[slug]/page.jsx
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { serverApi } from "@/lib/server-fetch";
import styles from "./category.module.css";
import ShopByCategory from "@/components/category/ShopByCategory/ShopByCategory";
import CategoryBrandBar from "@/components/category/CategoryBrandBar/CategoryBrandBar";
import CategoryToolbar from "@/components/category/CategoryToolbar/CategoryToolbar";
import ProductGrid from "@/components/category/ProductGrid/ProductGrid";
import Pagination from "@/components/common/Pagination/Pagination";
import ProductGridSkeleton from "@/components/category/ProductGrid/ProductGridSkeleton";

// Generate metadata for SEO
export async function generateMetadata({ params }) {
  const { locale, slug } = await params;
  const category = await getCategoryBySlug(slug, locale);

  if (!category) {
    return { title: "Category Not Found" };
  }

  return {
    title: `${category.name} | La Jolie`,
    description: `Shop ${category.name} products at La Jolie. Premium quality beauty and skincare products.`,
    openGraph: {
      title: `${category.name} | La Jolie`,
      description: `Shop ${category.name} products at La Jolie`,
      images: [category.imageUrl],
    },
  };
}

// Helper: Get category by slug
async function getCategoryBySlug(slug, locale) {
  const result = await serverApi.get("api/CategoryDetails/category", {
    locale,
    revalidate: 3600,
    tags: ["categories"],
  });

  if (!result.success) return null;

  const categoryName = slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return result.data?.find(
    (cat) => cat.name.toLowerCase() === categoryName.toLowerCase(),
  );
}

// Helper: Get product types and brands
async function getCategoryDetails(categoryId, locale) {
  const result = await serverApi.get(`api/CategoryDetails/${categoryId}`, {
    locale,
    revalidate: 1800,
    tags: [`category-${categoryId}`],
  });

  return result.success ? result.data : [];
}

// Helper: normalize API response to { products: array, totalCount: number }
function normalizeProductsResponse(result) {
  if (!result?.success) return { products: [], totalCount: 0 };
  const raw = result.data;
  if (!raw) return { products: [], totalCount: 0 };
  // API may return: array directly, or { data: [] }, or { items: [] }, or { data: { data: [] } }
  let list = [];
  if (Array.isArray(raw)) {
    list = raw;
  } else if (Array.isArray(raw.data)) {
    list = raw.data;
  } else if (Array.isArray(raw.items)) {
    list = raw.items;
  } else if (raw?.data && Array.isArray(raw.data.data)) {
    list = raw.data.data;
  }
  const totalCount =
    typeof raw.totalCount === "number"
      ? raw.totalCount
      : typeof result.totalCount === "number"
        ? result.totalCount
        : list.length;
  return { products: list, totalCount };
}

// Helper: Get products with pagination info
async function getProducts(productTypeId, brandId, pageNo, locale) {
  const pageSize = 20;
  const endpoint = `api/CategoryDetails?productTypeId=${productTypeId}&brandId=${brandId}&pageNo=${pageNo}&pageSize=${pageSize}`;

  const result = await serverApi.get(endpoint, {
    locale,
    revalidate: 300,
    tags: [`products-${productTypeId}-${brandId}`],
  });

  return normalizeProductsResponse(result);
}

// Products section: toolbar (with count) + grid + pagination (Suspense boundary)
async function ProductsContent({
  selectedProductTypeId,
  selectedBrandId,
  page,
  locale,
  slug,
  productTypeName,
}) {
  const { products, totalCount } = await getProducts(
    selectedProductTypeId,
    selectedBrandId,
    parseInt(page),
    locale,
  );

  const pageSize = 20;
  const totalPages = Math.ceil(totalCount / pageSize);
  const currentPage = parseInt(page);

  if (!products?.length) {
    return (
      <div className={styles.emptyState}>
        <p>No products found with the selected filters</p>
      </div>
    );
  }

  return (
    <>
      <CategoryToolbar
        productTypeName={productTypeName}
        totalCount={totalCount}
      />
      <ProductGrid products={products} locale={locale} />
      {totalPages > 1 && (
        <Pagination
          variant="circular"
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(newPage) => {
            const params = new URLSearchParams();
            params.set("productType", selectedProductTypeId);
            if (selectedBrandId) params.set("brand", selectedBrandId);
            if (newPage !== 1) params.set("page", String(newPage));
            return `/${locale}/category/${slug}?${params.toString()}`;
          }}
        />
      )}
    </>
  );
}

// Main content component (Luxe-style layout: Shop by Category + Brand bar + Grid)
async function CategoryContent({ category, locale, slug, searchParams }) {
  const { productType, brand, page = "1" } = searchParams;

  const categoryDetails = await getCategoryDetails(category.id, locale);

  if (!categoryDetails?.length) {
    return (
      <div className={styles.content}>
        <div className={styles.emptyState}>
          <p>No products available</p>
        </div>
      </div>
    );
  }

  const firstProductType = categoryDetails[0];
  const selectedProductTypeId =
    productType || String(firstProductType.productTypeId);
  const selectedProductType =
    categoryDetails.find(
      (pt) => String(pt.productTypeId) === selectedProductTypeId,
    ) || firstProductType;
  const firstBrand = selectedProductType.brands?.[0];
  const selectedBrandId =
    brand || (firstBrand ? String(firstBrand.brandId) : null);

  if (!productType || !brand) {
    const params = new URLSearchParams();
    params.set("productType", selectedProductTypeId);
    if (selectedBrandId) params.set("brand", selectedBrandId);
    if (page !== "1") params.set("page", page);
    redirect(`/${locale}/category/${slug}?${params.toString()}`);
  }

  return (
    <div className={styles.content}>
      <ShopByCategory
        productTypes={categoryDetails}
        selectedProductTypeId={selectedProductTypeId}
        locale={locale}
        categorySlug={slug}
      />

      <CategoryBrandBar
        brands={selectedProductType.brands || []}
        selectedBrandId={selectedBrandId}
        selectedProductTypeId={selectedProductTypeId}
        locale={locale}
        categorySlug={slug}
      />

      <section className={styles.main}>
        <Suspense
          key={`${selectedProductTypeId}-${selectedBrandId}-${page}`}
          fallback={<ProductGridSkeleton />}
        >
          <ProductsContent
            selectedProductTypeId={selectedProductTypeId}
            selectedBrandId={selectedBrandId}
            page={page}
            locale={locale}
            slug={slug}
            productTypeName={selectedProductType.productTypeName}
          />
        </Suspense>
      </section>
    </div>
  );
}

export default async function CategoryPage({ params, searchParams }) {
  const { locale, slug } = await params;
  const resolvedSearchParams = await searchParams;

  const category = await getCategoryBySlug(slug, locale);
  if (!category) notFound();

  return (
    <div className={styles.container}>
      <CategoryContent
        category={category}
        locale={locale}
        slug={slug}
        searchParams={resolvedSearchParams}
      />
    </div>
  );
}
