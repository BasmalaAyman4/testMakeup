"use client";
import React from "react";
import styles from "./card.module.css";
import Image from "next/image";
import { Heart } from "lucide-react";
import noImg from "@/assets/noImg.png";
import Link from "next/link";
import { useLocale } from "@/contexts/LocaleContext";

/** Single design-system card used across the project (category, home, etc.) */
const Card = ({ product, active }) => {
  const { locale } = useLocale();
  if (!product) return null;

  const productId = product.productId ?? product.id;
  const productUrl = productId ? `/${locale}/products/${productId}` : "#";
  const image = product.productImage ?? product.image;
  const name = product.productName ?? product.name ?? "";
  const price = product.saleaPrice ?? product.salePrice ?? product.price ?? 0;
  const typeLabel = product.productType ?? product.productTypeName ?? "";

  return (
    <div className={styles.cardContainer}>
      <div className={styles.card}>
        <Link href={productUrl}>
          <div className={styles.card__shine} />
          <div className={styles.card__glow} />
          <div className={styles.card__content}>
            {typeLabel && <div className={styles.card__badge}>{typeLabel}</div>}
            <div className={styles.card__image}>
              {image ? (
                <Image
                  alt=""
                  src={image}
                  loading="lazy"
                  quality={75}
                  placeholder="blur"
                  fill
                  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R+Rw=="
                />
              ) : (
                <Image alt="" src={noImg} fill />
              )}
            </div>
            <div className={styles.card__text}>
              <p className={styles.card__title}>{name}</p>
            </div>
            <div className={styles.card__footer}>
              <div className={styles.card__price}>{price} EGP</div>
              <div className={styles.card__button}>
                <Heart size={20} />
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default Card;
