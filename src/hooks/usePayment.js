import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, addDoc, collection, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function usePayment(instituteId) {
    const [paymentConfig, setPaymentConfig] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState(null);

    // Fetch payment config from Firestore
    useEffect(() => {
        if (!instituteId) return;
        (async () => {
            try {
                const snap = await getDoc(doc(db, `institutes/${instituteId}/settings/payment`));
                if (snap.exists()) {
                    setPaymentConfig(snap.data());
                }
            } catch (err) {
                console.error('Error fetching payment config:', err);
            }
        })();
    }, [instituteId]);

    const isPaymentConfigured = !!paymentConfig && !!paymentConfig.activeGateway;
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
        amount, description, prefillName, prefillEmail, prefillPhone, metadata = {},
    }) => {
        setProcessing(true);
        setError(null);

        try {
            const loaded = await loadRazorpaySDK();
            if (!loaded) throw new Error('Failed to load Razorpay SDK');

            const mode = paymentConfig.mode || 'test';
            const apiKey = mode === 'live' ? paymentConfig.razorpayLiveKey : paymentConfig.razorpayTestKey;
            if (!apiKey) throw new Error('Razorpay API key not configured');

            // Record payment attempt
            const paymentRef = await addDoc(collection(db, `institutes/${instituteId}/payments`), {
                amount, description, gateway: 'razorpay', mode, status: 'initiated',
                metadata, createdAt: new Date().toISOString(),
            });

            return new Promise((resolve, reject) => {
                const options = {
                    key: apiKey,
                    amount: amount * 100, // Razorpay uses paise
                    currency: 'INR',
                    name: paymentConfig.businessName || 'Z Typers',
                    description,
                    order_id: undefined,
                    handler: async (response) => {
                        await updateDoc(doc(db, `institutes/${instituteId}/payments`, paymentRef.id), {
                            status: 'success', paymentId: response.razorpay_payment_id,
                            completedAt: new Date().toISOString(),
                        });
                        setProcessing(false);
                        resolve({ paymentDocId: paymentRef.id, paymentId: response.razorpay_payment_id });
                    },
                    prefill: {
                        name: prefillName || '', email: prefillEmail || '', contact: prefillPhone || '',
                    },
                    theme: { color: '#7c3aed' },
                    modal: {
                        ondismiss: () => {
                            updateDoc(doc(db, `institutes/${instituteId}/payments`, paymentRef.id), {
                                status: 'cancelled',
                            });
                            setProcessing(false);
                            reject(new Error('Payment cancelled by user'));
                        },
                    },
                };

                const rzp = new window.Razorpay(options);
                rzp.on('payment.failed', async (resp) => {
                    await updateDoc(doc(db, `institutes/${instituteId}/payments`, paymentRef.id), {
                        status: 'failed', error: resp.error?.description || 'Failed',
                    });
                    setProcessing(false);
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

    // ── Stripe Payment (redirect-based) ──
    const startStripePayment = useCallback(async ({
        amount, description, prefillName, prefillEmail, metadata = {},
    }) => {
        setProcessing(true);
        setError(null);
        try {
            const mode = paymentConfig.mode || 'test';
            const apiKey = mode === 'live' ? paymentConfig.stripeLiveKey : paymentConfig.stripeTestKey;
            if (!apiKey) throw new Error('Stripe API key not configured');

            // Record payment attempt
            const paymentRef = await addDoc(collection(db, `institutes/${instituteId}/payments`), {
                amount, description, gateway: 'stripe', mode, status: 'initiated',
                metadata, createdAt: new Date().toISOString(),
            });

            // Note: Full Stripe integration requires a backend (Cloud Function) for creating Checkout Sessions.
            // For now, we store the intent and admin can handle via Stripe dashboard.
            await updateDoc(doc(db, `institutes/${instituteId}/payments`, paymentRef.id), {
                status: 'pending_stripe', note: 'Stripe requires backend integration for Checkout Session',
            });

            setProcessing(false);
            return { paymentDocId: paymentRef.id, paymentId: null, note: 'Stripe payment recorded' };
        } catch (err) {
            setProcessing(false);
            setError(err.message);
            throw err;
        }
    }, [paymentConfig, instituteId]);

    // ── Cashfree Payment ──
    const startCashfreePayment = useCallback(async ({
        amount, description, prefillName, prefillEmail, prefillPhone, metadata = {},
    }) => {
        setProcessing(true);
        setError(null);
        try {
            const mode = paymentConfig.mode || 'test';
            const appId = mode === 'live' ? paymentConfig.cashfreeLiveAppId : paymentConfig.cashfreeTestAppId;
            if (!appId) throw new Error('Cashfree App ID not configured');

            // Record payment attempt
            const paymentRef = await addDoc(collection(db, `institutes/${instituteId}/payments`), {
                amount, description, gateway: 'cashfree', mode, status: 'initiated',
                metadata, createdAt: new Date().toISOString(),
            });

            const loaded = await loadCashfreeSDK();
            if (!loaded) {
                // Fallback: create order link
                await updateDoc(doc(db, `institutes/${instituteId}/payments`, paymentRef.id), {
                    status: 'pending_cashfree', note: 'Cashfree SDK failed to load. Use Cashfree dashboard to create order.',
                });
                setProcessing(false);
                return { paymentDocId: paymentRef.id, paymentId: null, note: 'Cashfree payment recorded' };
            }

            // Cashfree requires backend to create order. Record intent.
            await updateDoc(doc(db, `institutes/${instituteId}/payments`, paymentRef.id), {
                status: 'pending_cashfree', note: 'Cashfree requires backend to create order session.',
            });

            setProcessing(false);
            return { paymentDocId: paymentRef.id, paymentId: null, note: 'Cashfree payment recorded' };
        } catch (err) {
            setProcessing(false);
            setError(err.message);
            throw err;
        }
    }, [paymentConfig, instituteId]);

    // ── PayU Payment (form redirect) ──
    const startPayUPayment = useCallback(async ({
        amount, description, prefillName, prefillEmail, prefillPhone, metadata = {},
    }) => {
        setProcessing(true);
        setError(null);
        try {
            const mode = paymentConfig.mode || 'test';
            const merchantKey = mode === 'live' ? paymentConfig.payuLiveMerchantKey : paymentConfig.payuTestMerchantKey;
            if (!merchantKey) throw new Error('PayU Merchant Key not configured');

            // Record payment attempt
            const paymentRef = await addDoc(collection(db, `institutes/${instituteId}/payments`), {
                amount, description, gateway: 'payu', mode, status: 'initiated',
                metadata, createdAt: new Date().toISOString(),
            });

            // PayU requires server-side hash generation for security.
            // Record the intent for now.
            await updateDoc(doc(db, `institutes/${instituteId}/payments`, paymentRef.id), {
                status: 'pending_payu', note: 'PayU requires server-side hash. Use PayU dashboard to process.',
            });

            setProcessing(false);
            return { paymentDocId: paymentRef.id, paymentId: null, note: 'PayU payment recorded' };
        } catch (err) {
            setProcessing(false);
            setError(err.message);
            throw err;
        }
    }, [paymentConfig, instituteId]);

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
