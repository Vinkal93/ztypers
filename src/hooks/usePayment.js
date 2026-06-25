import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, auth, functions } from '../lib/firebase';

export default function usePayment(instituteId) {
    const [paymentConfig, setPaymentConfig] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState(null);

    // Fetch public payment configuration from Firestore (no secrets exposed)
    useEffect(() => {
        (async () => {
            try {
                if (instituteId) {
                    // Fetch public institute details to check if payment is configured
                    const snap = await getDoc(doc(db, `institutes/${instituteId}`));
                    if (snap.exists()) {
                        const data = snap.data();
                        setPaymentConfig({
                            activeGateway: data.activeGateway || null,
                            paymentMode: data.paymentMode || 'test',
                            paymentConfigured: !!data.paymentConfigured,
                        });
                    } else {
                        setPaymentConfig(null);
                    }
                } else {
                    // Fallback to global payment settings if no instituteId
                    const snap = await getDoc(doc(db, 'appConfig', 'payment'));
                    if (snap.exists()) {
                        const data = snap.data();
                        setPaymentConfig({
                            activeGateway: data.activeGateway || 'razorpay',
                            paymentMode: data.paymentMode || 'test',
                            paymentConfigured: !!data.razorpayKey,
                        });
                    } else {
                        setPaymentConfig(null);
                    }
                }
            } catch (err) {
                console.error('Error fetching payment status:', err);
                setPaymentConfig(null);
            }
        })();
    }, [instituteId]);

    const isPaymentConfigured = !!paymentConfig && !!paymentConfig.paymentConfigured;
    const activeGateway = paymentConfig?.activeGateway || 'razorpay';

    // ── Load Razorpay SDK ──
    const loadRazorpaySDK = () => new Promise((resolve) => {
        if (window.Razorpay) return resolve(true);
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });

    // ── Load Cashfree SDK ──
    const loadCashfreeSDK = () => new Promise((resolve) => {
        if (window.Cashfree) return resolve(true);
        const script = document.createElement('script');
        script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });

    // ── Razorpay Payment ──
    const startRazorpayPayment = useCallback(async ({
        amount, description, prefillName, prefillEmail, prefillPhone, metadata = {}, instituteId: paramInstituteId,
    }) => {
        setProcessing(true);
        setError(null);

        const targetInstituteId = paramInstituteId !== undefined ? paramInstituteId : instituteId;

        try {
            // 1. Ensure Razorpay SDK is loaded
            const loaded = await loadRazorpaySDK();
            if (!loaded) throw new Error('Failed to load Razorpay SDK');

            // 2. Call backend to create Razorpay Order securely
            const createOrderFn = httpsCallable(functions, 'createRazorpayOrder');
            const orderResult = await createOrderFn({
                instituteId: targetInstituteId,
                amount: Number(amount), // in Rupees
                currency: 'INR',
                notes: {
                    description: description || '',
                    prefillName: prefillName || '',
                    prefillEmail: prefillEmail || '',
                    prefillPhone: prefillPhone || '',
                    ...metadata,
                },
                userId: auth.currentUser?.uid || null,
            });

            const { keyId, orderId, amount: amountInPaise, currency } = orderResult.data;

            // 3. Open Razorpay Checkout overlay
            return new Promise((resolve, reject) => {
                const options = {
                    key: keyId,
                    amount: amountInPaise,
                    currency: currency,
                    name: paymentConfig?.businessName || 'Z Typers',
                    description: description || '',
                    order_id: orderId,
                    handler: async (response) => {
                        setProcessing(true);
                        try {
                            // 4. Verify payment signature on the backend securely
                            const verifyFn = httpsCallable(functions, 'verifyRazorpayPayment');
                            const verifyResult = await verifyFn({
                                instituteId: targetInstituteId,
                                razorpayOrderId: response.razorpay_order_id,
                                razorpayPaymentId: response.razorpay_payment_id,
                                razorpaySignature: response.razorpay_signature,
                            });

                            if (verifyResult.data?.success) {
                                setProcessing(false);
                                resolve({
                                    paymentId: response.razorpay_payment_id,
                                    orderId: response.razorpay_order_id,
                                });
                            } else {
                                throw new Error(verifyResult.data?.error || 'Payment signature verification failed');
                            }
                        } catch (err) {
                            setProcessing(false);
                            setError(err.message);
                            reject(err);
                        }
                    },
                    prefill: {
                        name: prefillName || '',
                        email: prefillEmail || '',
                        contact: prefillPhone || '',
                    },
                    theme: { color: '#7c3aed' },
                    modal: {
                        ondismiss: () => {
                            setProcessing(false);
                            reject(new Error('Payment cancelled by user'));
                        },
                    },
                };

                const rzp = new window.Razorpay(options);
                rzp.on('payment.failed', (resp) => {
                    setProcessing(false);
                    setError(resp.error?.description || 'Payment failed');
                    reject(new Error(resp.error?.description || 'Payment failed'));
                });
                rzp.open();
            });
        } catch (err) {
            setProcessing(false);
            setError(err.message);
            throw err;
        }
    }, [paymentConfig, instituteId]);

    // ── Stripe Payment (mock/redirect-based) ──
    const startStripePayment = useCallback(async () => {
        setProcessing(true);
        setError('Stripe is not securely configured in this version.');
        setProcessing(false);
        throw new Error('Stripe is not securely configured. Please use Razorpay.');
    }, []);

    // ── Cashfree Payment (mock/redirect-based) ──
    const startCashfreePayment = useCallback(async () => {
        setProcessing(true);
        setError('Cashfree is not securely configured in this version.');
        setProcessing(false);
        throw new Error('Cashfree is not securely configured. Please use Razorpay.');
    }, []);

    // ── PayU Payment (mock/redirect-based) ──
    const startPayUPayment = useCallback(async () => {
        setProcessing(true);
        setError('PayU is not securely configured in this version.');
        setProcessing(false);
        throw new Error('PayU is not securely configured. Please use Razorpay.');
    }, []);

    // ── Universal Payment Starter ──
    const startPayment = useCallback(async (paymentDetails) => {
        const gateway = activeGateway;
        switch (gateway) {
            case 'razorpay': return startRazorpayPayment(paymentDetails);
            case 'stripe': return startStripePayment(paymentDetails);
            case 'cashfree': return startCashfreePayment(paymentDetails);
            case 'payu': return startPayUPayment(paymentDetails);
            default: throw new Error(`Unknown payment gateway: ${gateway}`);
        }
    }, [activeGateway, startRazorpayPayment, startStripePayment, startCashfreePayment, startPayUPayment]);

    return {
        paymentConfig,
        isPaymentConfigured,
        activeGateway,
        processing,
        error,
        startPayment,
        startRazorpayPayment,
        startStripePayment,
        startCashfreePayment,
        startPayUPayment,
    };
}
