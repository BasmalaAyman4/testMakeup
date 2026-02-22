// components/common/AddAddressDialog/AddAddressDialog.jsx
'use client';

import { useState, useEffect, memo } from 'react';
import { X, MapPin, Home, Building2, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAddAddress } from '@/hooks/useAddAddress';
import styles from './AddAddressDialog.module.css';

/**
 * Reusable Add Address Dialog Component
 * Used in Checkout, Profile, and anywhere address management is needed
 */
const AddAddressDialog = memo(({ 
  isOpen, 
  onClose, 
  onSuccess,
  locale = 'ar' 
}) => {
  const {
    basicData,
    isLoading,
    isLoadingBasicData,
    error: hookError,
    addAddress,
    getAreasByCity,
    clearError
  } = useAddAddress(locale);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    cityId: '',
    areaId: '',
    streetName: '',
    buldingNo: '',
    floorNo: '',
    flatNo: '',
    description: '',
    note: '',
    isDefault: false,
    address: ''
  });

  const [filteredAreas, setFilteredAreas] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);

  // Update areas when city changes
  useEffect(() => {
    if (formData.cityId) {
      const areas = getAreasByCity(Number(formData.cityId));
      setFilteredAreas(areas);
      // Reset area if current selection is invalid
      if (formData.areaId && !areas.find(a => a.areaId === Number(formData.areaId))) {
        setFormData(prev => ({ ...prev, areaId: '' }));
      }
    } else {
      setFilteredAreas([]);
    }
  }, [formData.cityId, getAreasByCity]);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      resetForm();
      clearError();
      setSubmitError(null);
      setValidationErrors({});
    }
  }, [isOpen]);

  const resetForm = () => {
    setFormData({
      name: '',
      cityId: '',
      areaId: '',
      streetName: '',
      buldingNo: '',
      floorNo: '',
      flatNo: '',
      description: '',
      note: '',
      isDefault: false,
      address: ''
    });
    setFilteredAreas([]);
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = locale === 'ar' ? 'اسم العنوان مطلوب' : 'Address label is required';
    }

    if (!formData.cityId) {
      errors.cityId = locale === 'ar' ? 'المحافظة مطلوبة' : 'Governorate is required';
    }

    if (!formData.areaId) {
      errors.areaId = locale === 'ar' ? 'المنطقة مطلوبة' : 'Area is required';
    }

    if (!formData.streetName.trim()) {
      errors.streetName = locale === 'ar' ? 'اسم الشارع مطلوب' : 'Street name is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) {
      return;
    }

    // Build final address string
    const selectedCity = basicData.cities.find(c => c.cityId === Number(formData.cityId));
    const selectedArea = filteredAreas.find(a => a.areaId === Number(formData.areaId));

    const fullAddress = `${selectedCity?.cityName || ''}, ${selectedArea?.areaName || ''}, ${formData.streetName}`;

    const payload = {
      name: formData.name,
      cityId: Number(formData.cityId),
      areaId: Number(formData.areaId),
      streetName: formData.streetName,
      buldingNo: formData.buldingNo || null,
      floorNo: formData.floorNo ? Number(formData.floorNo) : null,
      flatNo: formData.flatNo ? Number(formData.flatNo) : null,
      description: formData.description || null,
      note: formData.note || null,
      isDefault: formData.isDefault,
      address: fullAddress
    };

    const result = await addAddress(payload);

    if (result.success) {
      onSuccess?.(result.data);
      onClose();
    } else {
      setSubmitError(result.error || (locale === 'ar' ? 'فشل إضافة العنوان' : 'Failed to add address'));
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className={styles.overlay} onClick={onClose}>
        <motion.div
          className={styles.dialog}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={styles.header}>
            <h2 className={styles.title}>
              <MapPin size={24} />
              {locale === 'ar' ? 'إضافة عنوان جديد' : 'Add New Address'}
            </h2>
            <button
              onClick={onClose}
              className={styles.closeButton}
              aria-label={locale === 'ar' ? 'إغلاق' : 'Close'}
            >
              <X size={20} />
            </button>
          </div>

          {/* Error Banner */}
          {(submitError || hookError) && (
            <div className={styles.errorBanner}>
              {submitError || hookError}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Address Label */}
            <div className={styles.formGroup}>
              <label htmlFor="name" className={styles.label}>
                {locale === 'ar' ? 'اسم العنوان' : 'Address Label'} *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder={locale === 'ar' ? 'مثال: المنزل، العمل، والدتي...' : 'e.g., Home, Work, Parents...'}
                className={`${styles.input} ${validationErrors.name ? styles.inputError : ''}`}
              />
              {validationErrors.name && (
                <span className={styles.errorText}>{validationErrors.name}</span>
              )}
            </div>

            {/* Address Type Buttons */}
            <div className={styles.formGroup}>
              <label className={styles.label}>
                {locale === 'ar' ? 'نوع العنوان' : 'Address Type'}
              </label>
              <div className={styles.typeButtons}>
                <button
                  type="button"
                  className={`${styles.typeButton} ${formData.name === (locale === 'ar' ? 'المنزل' : 'Home') ? styles.typeButtonActive : ''}`}
                  onClick={() => setFormData(prev => ({ ...prev, name: locale === 'ar' ? 'المنزل' : 'Home' }))}
                >
                  <Home size={18} />
                  {locale === 'ar' ? 'المنزل' : 'Home'}
                </button>
                <button
                  type="button"
                  className={`${styles.typeButton} ${formData.name === (locale === 'ar' ? 'العمل' : 'Work') ? styles.typeButtonActive : ''}`}
                  onClick={() => setFormData(prev => ({ ...prev, name: locale === 'ar' ? 'العمل' : 'Work' }))}
                >
                  <Building2 size={18} />
                  {locale === 'ar' ? 'العمل' : 'Work'}
                </button>
                <button
                  type="button"
                  className={`${styles.typeButton} ${formData.name === (locale === 'ar' ? 'آخر' : 'Other') ? styles.typeButtonActive : ''}`}
                  onClick={() => setFormData(prev => ({ ...prev, name: locale === 'ar' ? 'آخر' : 'Other' }))}
                >
                  <Navigation size={18} />
                  {locale === 'ar' ? 'آخر' : 'Other'}
                </button>
              </div>
            </div>

            {/* Governorate */}
            <div className={styles.formGroup}>
              <label htmlFor="cityId" className={styles.label}>
                {locale === 'ar' ? 'المحافظة' : 'Governorate'} *
              </label>
              <select
                id="cityId"
                name="cityId"
                value={formData.cityId}
                onChange={handleInputChange}
                className={`${styles.select} ${validationErrors.cityId ? styles.inputError : ''}`}
                disabled={isLoadingBasicData}
              >
                <option value="">
                  {isLoadingBasicData 
                    ? (locale === 'ar' ? 'جاري التحميل...' : 'Loading...')
                    : (locale === 'ar' ? 'اختر المحافظة' : 'Select Governorate')
                  }
                </option>
                {basicData.cities.map(city => (
                  <option key={city.cityId} value={city.cityId}>
                    {city.cityName}
                  </option>
                ))}
              </select>
              {validationErrors.cityId && (
                <span className={styles.errorText}>{validationErrors.cityId}</span>
              )}
            </div>

            {/* Area */}
            <div className={styles.formGroup}>
              <label htmlFor="areaId" className={styles.label}>
                {locale === 'ar' ? 'المنطقة' : 'Area'} *
              </label>
              <select
                id="areaId"
                name="areaId"
                value={formData.areaId}
                onChange={handleInputChange}
                className={`${styles.select} ${validationErrors.areaId ? styles.inputError : ''}`}
                disabled={!formData.cityId || filteredAreas.length === 0}
              >
                <option value="">
                  {!formData.cityId
                    ? (locale === 'ar' ? 'اختر المحافظة أولاً' : 'Select governorate first')
                    : (locale === 'ar' ? 'اختر المنطقة' : 'Select Area')
                  }
                </option>
                {filteredAreas.map(area => (
                  <option key={area.areaId} value={area.areaId}>
                    {area.areaName}
                  </option>
                ))}
              </select>
              {validationErrors.areaId && (
                <span className={styles.errorText}>{validationErrors.areaId}</span>
              )}
            </div>

            {/* Street Name */}
            <div className={styles.formGroup}>
              <label htmlFor="streetName" className={styles.label}>
                {locale === 'ar' ? 'اسم الشارع' : 'Street Name'} *
              </label>
              <input
                type="text"
                id="streetName"
                name="streetName"
                value={formData.streetName}
                onChange={handleInputChange}
                placeholder={locale === 'ar' ? 'أدخل اسم الشارع' : 'Enter street name'}
                className={`${styles.input} ${validationErrors.streetName ? styles.inputError : ''}`}
              />
              {validationErrors.streetName && (
                <span className={styles.errorText}>{validationErrors.streetName}</span>
              )}
            </div>

            {/* Building, Floor, Flat - Grid */}
            <div className={styles.gridRow}>
              <div className={styles.formGroup}>
                <label htmlFor="buldingNo" className={styles.label}>
                  {locale === 'ar' ? 'رقم المبنى' : 'Building No'}
                </label>
                <input
                  type="text"
                  id="buldingNo"
                  name="buldingNo"
                  value={formData.buldingNo}
                  onChange={handleInputChange}
                  placeholder={locale === 'ar' ? 'اختياري' : 'Optional'}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="floorNo" className={styles.label}>
                  {locale === 'ar' ? 'الطابق' : 'Floor No'}
                </label>
                <input
                  type="number"
                  id="floorNo"
                  name="floorNo"
                  value={formData.floorNo}
                  onChange={handleInputChange}
                  placeholder={locale === 'ar' ? 'اختياري' : 'Optional'}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="flatNo" className={styles.label}>
                  {locale === 'ar' ? 'رقم الشقة' : 'Flat No'}
                </label>
                <input
                  type="number"
                  id="flatNo"
                  name="flatNo"
                  value={formData.flatNo}
                  onChange={handleInputChange}
                  placeholder={locale === 'ar' ? 'اختياري' : 'Optional'}
                  className={styles.input}
                />
              </div>
            </div>

            {/* Additional Information */}
            <div className={styles.formGroup}>
              <label htmlFor="description" className={styles.label}>
                {locale === 'ar' ? 'معلومات إضافية' : 'Additional Information'}
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder={locale === 'ar' ? 'أي تفاصيل إضافية (معالم، تعليمات خاصة...)' : 'Any additional details (landmarks, special instructions...)'}
                rows={3}
                className={styles.textarea}
              />
            </div>

            {/* Set as Default */}
            <div className={styles.checkboxGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  name="isDefault"
                  checked={formData.isDefault}
                  onChange={handleInputChange}
                  className={styles.checkbox}
                />
                <span>{locale === 'ar' ? 'تعيين كعنوان افتراضي' : 'Set as default address'}</span>
              </label>
            </div>

            {/* Actions */}
            <div className={styles.actions}>
              <button
                type="button"
                onClick={onClose}
                className={styles.cancelButton}
                disabled={isLoading}
              >
                {locale === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                className={styles.submitButton}
                disabled={isLoading || isLoadingBasicData}
              >
                {isLoading
                  ? (locale === 'ar' ? 'جاري الحفظ...' : 'Saving...')
                  : (locale === 'ar' ? 'حفظ العنوان' : 'Save Address')
                }
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
});

AddAddressDialog.displayName = 'AddAddressDialog';

export default AddAddressDialog;
