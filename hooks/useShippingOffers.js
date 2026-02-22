// hooks/useShippingOffers.js
'use client';

import { useState, useEffect } from 'react';
import apiClient from '@/lib/api-client';

/**
 * Client-side hook for shipping offers
 * @param {string} locale - Language locale
 * @param {boolean} skipCache - Skip cache for fresh data (default: true)
 */
export function useShippingOffers(locale = 'ar', skipCache = true) {
  const [offers, setOffers] = useState(getDefaultOffer());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchOffers() {
      try {
        const result = await apiClient.get('api/ShippingOffer', locale, {
          skipCache, // Use parameter to control caching
          timeout: 5000,
        });

        if (result.success && result.data?.[0]) {
          const normalized = normalizeShippingOffer(result.data[0]);
          if (isMounted) {
            setOffers(normalized);
            setError(null);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
          // Keep default offers on error
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchOffers();
    return () => {
      isMounted = false;
    };
  }, [locale, skipCache]);

  return { offers, loading, error };
}

// Helpers (duplicated for client-side use)
function normalizeShippingOffer(offer) {
  return {
    orderMinValue: offer.orderMinValue || 800,
    discountValue: offer.value || 60,
    discountText: offer.valueText || '60 %',
    isPercentage: offer.valueText?.includes('%') ?? true,
  };
}

function getDefaultOffer() {
  return {
    orderMinValue: 800,
    discountValue: 60,
    discountText: '60 %',
    isPercentage: true,
  };
}
