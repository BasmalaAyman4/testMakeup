// components/checkout/CheckoutClient.jsx
'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/contexts/LocaleContext';
import { Plus } from 'lucide-react';
import AddAddressDialog from '@/components/common/AddAddressDialog/AddAddressDialog';
import styles from './checkout.module.css';

const SHIPPING_BASE_FEE = 50;
const PAYMENT_TYPES = {
  CASH: 1,
  VISA: 2
};

export default function CheckoutClient({ 
  locale, 
  data, 
  addresses = [], 
  cartIds = [], 
  error: initialError 
}) {
  const router = useRouter();
  const { t } = useLocale();
  
  // State management - ALL hooks at the top
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [selectedPaymentType, setSelectedPaymentType] = useState(PAYMENT_TYPES.CASH);
  const [voucherCode, setVoucherCode] = useState('');
  const [usePoints, setUsePoints] = useState(false);
  const [useWallet, setUseWallet] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(initialError);
  const [isAddAddressOpen, setIsAddAddressOpen] = useState(false);
  const [currentAddresses, setCurrentAddresses] = useState(addresses);
  const [successMessage, setSuccessMessage] = useState(null);

  // Extract data safely  
  const {
    totalPoints = 0,
    totalWallet = 0,
    selectedCart = [],
    shippingOffers = [],
    appOption = {}
  } = data || {};

  // Initialize address selection after component mounts
  useEffect(() => {
    if (currentAddresses.length > 0 && !selectedAddressId) {
      const defaultAddress = currentAddresses.find(a => a.isDefault) || currentAddresses[0];
      setSelectedAddressId(defaultAddress?.id || null);
    }
  }, [currentAddresses, selectedAddressId]);

  // Handle successful address addition
  const handleAddressSuccess = useCallback((newAddress) => {
    console.log('New address added:', newAddress);
    
    // Validate that the address has an ID
    if (!newAddress || typeof newAddress !== 'object' || !newAddress.id) {
      console.error('Invalid address data received:', newAddress);
      
      // If backend requires full refresh, just refresh the page
      if (newAddress?.requiresRefresh) {
        setSuccessMessage(locale === 'ar' ? 'تم إضافة العنوان بنجاح' : 'Address added successfully');
        setIsAddAddressOpen(false);
        setTimeout(() => {
          router.refresh();
        }, 1000);
        return;
      }
      
      // Otherwise show error
      setError('Failed to add address - invalid response from server');
      setIsAddAddressOpen(false);
      router.refresh(); // Force refresh to get updated data
      return;
    }
    
    // Check if address already exists (prevent duplicates)
    setCurrentAddresses(prev => {
      const exists = prev.some(addr => addr.id === newAddress.id);
      if (exists) {
        console.log('Address already exists, skipping duplicate');
        return prev;
      }
      return [...prev, newAddress];
    });
    
    // Set as selected address
    setSelectedAddressId(newAddress.id);
    
    // Close dialog
    setIsAddAddressOpen(false);
    
    // Show success message
    setSuccessMessage(locale === 'ar' ? 'تم إضافة العنوان بنجاح' : 'Address added successfully');
    
    // Clear success message after 3 seconds
    setTimeout(() => setSuccessMessage(null), 3000);
    
    // Optionally refresh in background to sync with server
    router.refresh();
  }, [router, locale]);

  // Calculate order summary - memoized for performance
  const orderCalculations = useMemo(() => {
    if (!data) return null;
    
    const { selectedCart = [], shippingOffers = [], totalPoints = 0, totalWallet = 0 } = data;
    
    const subtotal = selectedCart.reduce((sum, item) => 
      sum + (item.price * item.qty), 0
    );
    
    // Shipping calculation
    const hasShippingOffer = shippingOffers.length > 0;
    const shippingOffer = shippingOffers[0];
    const qualifiesForDiscount = hasShippingOffer && 
      subtotal >= shippingOffer.orderMinValue;
    const shippingDiscount = qualifiesForDiscount 
      ? (shippingOffer.value / 100) * SHIPPING_BASE_FEE 
      : 0;
    const shippingFee = SHIPPING_BASE_FEE - shippingDiscount;

    // Wallet and points deduction
    const walletDeduction = useWallet ? Math.min(totalWallet, subtotal) : 0;
    const maxPointsValue = subtotal * 0.1; // Max 10% from points
    const pointsValue = totalPoints * 0.15; // Point rate
    const pointsDeduction = usePoints 
      ? Math.min(pointsValue, maxPointsValue, subtotal) 
      : 0;

    const total = Math.max(
      subtotal + shippingFee - walletDeduction - pointsDeduction, 
      0
    );

    return {
      subtotal,
      shippingFee,
      shippingDiscount,
      walletDeduction,
      pointsDeduction,
      total,
      hasShippingOffer,
      shippingOffer,
      qualifiesForDiscount
    };
  }, [data, useWallet, usePoints]);

  // Handle checkout submission
  const handleCheckout = useCallback(async () => {
    if (!data || !selectedAddressId) {
      setError(t('checkout.selectAddress', 'Please select a delivery address'));
      return;
    }
    
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        addressId: selectedAddressId,
        patmentType: selectedPaymentType,
        cartIds: cartIds.map(id => parseInt(id, 10)),
        pointNo: usePoints && totalPoints > 0 ? totalPoints : null,
        walletValue: useWallet && orderCalculations?.walletDeduction > 0 ? orderCalculations.walletDeduction : null,
        vCode: voucherCode || null,
        specialPackageId: null
      };

      if (selectedPaymentType === PAYMENT_TYPES.VISA) {
        Object.assign(payload, {
          cardToken: '',
          cardNumber: '',
          cardExpiryYear: 0,
          cardExpiryMonth: 0,
          cardCvv: 0
        });
      }

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-locale': locale
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || result.details || 'Checkout failed');
      }

      const orderId = result.data?.orderId || result.data?.id || '';
      router.push(`/${locale}/checkout/success?orderId=${orderId}`);
      
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err.message || t('checkout.failed', 'Checkout failed. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    data,
    selectedAddressId,
    selectedPaymentType,
    voucherCode,
    usePoints,
    useWallet,
    orderCalculations,
    cartIds,
    locale,
    router,
    t
  ]);

  // Handle initial error state (AFTER all hooks)
  if (error || !data) {
    return (
      <div className={styles.container}>
        <div className={styles.errorCard}>
          <div className={styles.errorIcon}>⚠️</div>
          <h2 className={styles.errorTitle}>
            {t('checkout.errorTitle', 'Error Loading Checkout')}
          </h2>
          <p className={styles.errorMessage}>{error}</p>
          <button
            onClick={() => router.push(`/${locale}/cart`)}
            className={styles.backButton}
          >
            {t('checkout.backToCart', 'Back to Cart')}
          </button>
        </div>
      </div>
    );
  }

  const selectedAddress = currentAddresses.find(a => a.id === selectedAddressId);

  return (
    <div className={styles.container}>
      {/* Error Banner */}
      {error && (
        <div className={styles.errorBanner}>
          {error}
          <button onClick={() => setError(null)} aria-label="Close error">×</button>
        </div>
      )}

      {/* Success Banner */}
      {successMessage && (
        <div className={styles.successBanner}>
          ✓ {successMessage}
        </div>
      )}

      <div className={styles.checkoutGrid}>
        {/* Left Column - Order Details */}
        <div className={styles.leftColumn}>
          {/* Order Items */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              {t('checkout.orderItems', 'Order Items')} ({selectedCart.length})
            </h2>
            <div className={styles.itemsList}>
              {selectedCart.map((item, index) => (
                <div key={`cart-${item.cartId || item.id}-${index}`} className={styles.cartItem}>
                  <div className={styles.itemInfo}>
                    <h3 className={styles.itemName}>{item.productName}</h3>
                    {item.productPackaging && (
                      <p className={styles.itemPackaging}>{item.productPackaging}</p>
                    )}
                  </div>
                  <div className={styles.itemQuantity}>×{item.qty}</div>
                  <div className={styles.itemPrice}>
                    EGP {(item.price * item.qty).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Shipping Offers */}
          {orderCalculations.hasShippingOffer && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>
                {t('checkout.shippingOffers', 'Shipping Offers')}
              </h3>
              <div className={styles.shippingOffer}>
                {orderCalculations.qualifiesForDiscount ? (
                  <p className={styles.offerActive}>
                    🎉 {orderCalculations.shippingOffer.valueText} {t('checkout.discountApplied', 'discount applied!')}
                  </p>
                ) : (
                  <p className={styles.offerInactive}>
                    {t('checkout.addMore', 'Add')} EGP {(
                      orderCalculations.shippingOffer.orderMinValue - 
                      orderCalculations.subtotal
                    ).toFixed(2)} {t('checkout.forDiscount', 'more for discount')}
                  </p>
                )}
              </div>
            </section>
          )}

          {/* Delivery Address */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>
                {t('checkout.deliveryAddress', 'Delivery Address')}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddAddressOpen(true)}
                className={styles.addAddressButton}
              >
                <Plus size={18} />
                {t('checkout.addAddress', 'Add Address')}
              </button>
            </div>
            {currentAddresses.length === 0 ? (
              <div className={styles.noAddressCard}>
                <p className={styles.noAddress}>
                  {t('checkout.noAddress', 'No addresses found. Please add an address.')}
                </p>
                <button
                  type="button"
                  onClick={() => setIsAddAddressOpen(true)}
                  className={styles.addAddressButtonPrimary}
                >
                  <Plus size={18} />
                  {t('checkout.addFirstAddress', 'Add Your First Address')}
                </button>
              </div>
            ) : (
              <div className={styles.addressList}>
                {currentAddresses.map((address, index) => (
                  <label key={`address-${address.id}-${index}`} className={styles.addressItem}>
                    <input
                      type="radio"
                      name="address"
                      value={address.id}
                      checked={selectedAddressId === address.id}
                      onChange={() => setSelectedAddressId(address.id)}
                      className={styles.addressRadio}
                    />
                    <div className={styles.addressContent}>
                      <div className={styles.addressName}>
                        {address.name}
                        {address.isDefault && (
                          <span className={styles.defaultBadge}>
                            {t('checkout.default', 'Default')}
                          </span>
                        )}
                      </div>
                      <div className={styles.addressDetails}>
                        {address.cityName}, {address.areaName}<br />
                        {address.streetName}, {t('checkout.building', 'Building')} {address.buldingNo}
                        {address.floorNo && `, ${t('checkout.floor', 'Floor')} ${address.floorNo}`}
                        {address.flatNo && `, ${t('checkout.flat', 'Flat')} ${address.flatNo}`}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </section>

          {/* Payment Method */}
          {appOption?.visaPayment && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>
                {t('checkout.paymentMethod', 'Payment Method')}
              </h3>
              <div className={styles.paymentOptions}>
                <label className={styles.paymentOption}>
                  <input
                    type="radio"
                    name="payment"
                    value={PAYMENT_TYPES.CASH}
                    checked={selectedPaymentType === PAYMENT_TYPES.CASH}
                    onChange={() => setSelectedPaymentType(PAYMENT_TYPES.CASH)}
                  />
                  <span>{t('checkout.cashOnDelivery', 'Cash on Delivery')}</span>
                </label>
                <label className={styles.paymentOption}>
                  <input
                    type="radio"
                    name="payment"
                    value={PAYMENT_TYPES.VISA}
                    checked={selectedPaymentType === PAYMENT_TYPES.VISA}
                    onChange={() => setSelectedPaymentType(PAYMENT_TYPES.VISA)}
                  />
                  <span>{t('checkout.creditCard', 'Credit/Debit Card')}</span>
                </label>
              </div>
            </section>
          )}
        </div>

        {/* Right Column - Order Summary */}
        <div className={styles.rightColumn}>
          <div className={styles.summaryCard}>
            <h2 className={styles.summaryTitle}>
              {t('checkout.orderSummary', 'Order Summary')}
            </h2>

            <div className={styles.summaryRow}>
              <span>{t('checkout.subtotal', 'Subtotal')}</span>
              <span>EGP {orderCalculations.subtotal.toFixed(2)}</span>
            </div>

            <div className={styles.summaryRow}>
              <span>{t('checkout.shipping', 'Shipping')}</span>
              <span>
                {orderCalculations.shippingDiscount > 0 ? (
                  <>
                    <span className={styles.strikethrough}>
                      EGP {SHIPPING_BASE_FEE.toFixed(2)}
                    </span>
                    <span className={styles.discounted}>
                      {' '}EGP {orderCalculations.shippingFee.toFixed(2)}
                    </span>
                  </>
                ) : (
                  `EGP ${orderCalculations.shippingFee.toFixed(2)}`
                )}
              </span>
            </div>

            {/* Wallet Toggle */}
            {appOption?.wallet && totalWallet > 0 && (
              <label className={styles.summaryCheckbox}>
                <input
                  type="checkbox"
                  checked={useWallet}
                  onChange={(e) => setUseWallet(e.target.checked)}
                />
                <span>
                  {t('checkout.useWallet', 'Use Wallet')} (EGP {totalWallet.toFixed(2)})
                  {useWallet && (
                    <span className={styles.deduction}>
                      {' '}-EGP {orderCalculations.walletDeduction.toFixed(2)}
                    </span>
                  )}
                </span>
              </label>
            )}

            {/* Points Toggle */}
            

            <div className={styles.summaryDivider} />

            <div className={styles.summaryTotal}>
              <span>{t('checkout.total', 'Total')}</span>
              <span>EGP {orderCalculations.total.toFixed(2)}</span>
            </div>

            <button
              onClick={handleCheckout}
              disabled={isSubmitting || !selectedAddressId || currentAddresses.length === 0}
              className={styles.checkoutButton}
            >
              {isSubmitting
                ? t('checkout.processing', 'Processing...')
                : t('checkout.placeOrder', 'Place Order')
              }
            </button>

            <p className={styles.secureNote}>
              🔒 {t('checkout.secureCheckout', 'Secure checkout')}
            </p>
          </div>
        </div>
      </div>

      {/* Add Address Dialog */}
      <AddAddressDialog
        isOpen={isAddAddressOpen}
        onClose={() => setIsAddAddressOpen(false)}
        onSuccess={handleAddressSuccess}
        locale={locale}
      />
    </div>
  );
}