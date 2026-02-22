// hooks/useAddAddress.js
'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for managing address operations
 * Uses Next.js API routes to avoid CORS issues
 */
export function useAddAddress(locale = 'ar') {
  const [basicData, setBasicData] = useState({ cities: [], areas: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingBasicData, setIsLoadingBasicData] = useState(true);
  const [error, setError] = useState(null);

  // Fetch cities and areas on mount
  useEffect(() => {
    fetchBasicData();
  }, [locale]);

  const fetchBasicData = async () => {
    setIsLoadingBasicData(true);
    setError(null);

    try {
      // Call Next.js API route instead of backend directly
      const response = await fetch(`/api/address/basic-data?locale=${locale}`);

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch basic data');
      }

      setBasicData({
        cities: result.data.cityDropdown || [],
        areas: result.data.areaDropdown || []
      });
    } catch (err) {
      console.error('Error fetching basic data:', err);
      setError(err.message);
    } finally {
      setIsLoadingBasicData(false);
    }
  };

  /**
   * Add new address
   */
  const addAddress = useCallback(async (addressData) => {
    setIsLoading(true);
    setError(null);

    try {
      // Call Next.js API route
      const response = await fetch('/api/address', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-locale': locale
        },
        body: JSON.stringify(addressData)
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to add address');
      }

      return { success: true, data: result.data };
    } catch (err) {
      console.error('Error adding address:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, [locale]);

  /**
   * Set address as default
   */
  const setAsDefault = useCallback(async (addressId) => {
    try {
      // Call Next.js API route
      const response = await fetch('/api/address/set-default', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-locale': locale
        },
        body: JSON.stringify({ addressId })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to set default address');
      }

      return { success: true };
    } catch (err) {
      console.error('Error setting default address:', err);
      return { success: false, error: err.message };
    }
  }, [locale]);

  /**
   * Get areas by city ID
   */
  const getAreasByCity = useCallback((cityId) => {
    if (!cityId) return [];
    return basicData.areas.filter(area => area.cityId === cityId);
  }, [basicData.areas]);

  return {
    basicData,
    isLoading,
    isLoadingBasicData,
    error,
    addAddress,
    setAsDefault,
    getAreasByCity,
    clearError: () => setError(null)
  };
}
