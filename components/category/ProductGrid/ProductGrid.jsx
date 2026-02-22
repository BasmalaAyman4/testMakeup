"use client";

import Card from "@/components/ui/Card/Card";
import styles from "./ProductGrid.module.css";

/** Normalize products to array (API may return { data: [] } or []) */
function toProductList(products) {
  if (!products) return [];
  if (Array.isArray(products)) return products;
  return products.data || products.items || [];
}

/** Map API product fields to Card props (productId, productName, productImage, saleaPrice, productType) */
function normalizeProduct(item) {
  if (!item || typeof item !== "object") return item;
  return {
    ...item,
    productId: item.productId ?? item.id ?? item.product_id,
    productName: item.productName ?? item.name ?? item.product_name ?? "",
    productImage:
      item.productImage ??
      item.image ??
      item.productImageUrl ??
      item.imageUrl ??
      null,
    saleaPrice:
      item.saleaPrice ?? item.salePrice ?? item.price ?? item.sale_price ?? 0,
    productType:
      item.productType ??
      item.productTypeName ??
      item.type ??
      item.category ??
      "",
  };
}

export default function ProductGrid({ products, locale }) {
  const list = toProductList(products);
  if (list.length === 0) return null;

  return (
    <div className={styles.grid}>
      {list.map((product) => {
        const normalized = normalizeProduct(product);
        const key = normalized.productId ?? normalized.id ?? Math.random();
        return <Card key={key} product={normalized} locale={locale} />;
      })}
    </div>
  );
}
