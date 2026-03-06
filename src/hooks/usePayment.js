/**
 * usePayment Hook — Razorpay + Stripe payment integration
 * Loads admin's payment config from Firestore and handles checkout
 */
import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, addDoc, collection, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

// Load Razorpay SDK dynamically
function loadRazorpayScript() {
    return new Promise((resolve) => {
        if (document.getElementById('razorpay-script')) { resolve(true); return; }
        const s = document.createElement('script');
        s.id = 'razorpay-script';
        s.src = 'https://checkout.razorpay.com/v1/checkout.js';
        s.onload = () => resolve(true);
        s.onerror = () => resolve(false);
        document.body.appendChild(s);
    });
}

export default function usePayment(instituteId) {
    const [paymentConfig, setPaymentConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    // Load payment config from institute settings
    useEffect(() => {
        if (!instituteId) { setLoading(false); return; }
        (async () => {
            try {
                const payDoc = await getDoc(doc(db, 'institutes', instituteId, 'settings', 'payment'));
                if (payDoc.exists()) {
                    setPaymentConfig(payDoc.data());
                }
            } catch (e) {
                console.error('Error loading payment config:', e);
            }
            setLoading(false);
        })();
    }, [instituteId]);

    const isPaymentConfigured = !!(paymentConfig?.razorpayKeyId);

    // ── Razorpay Checkout ──────────────────────────────────
    const startRazorpayPayment = useCallback(async ({
        amount, // in INR (₹), will be multiplied by 100 for paisa
        currency = 'INR',
        name = 'InSuite Typers',
        description = 'Event Entry Fee',
        prefillName = '',
        prefillEmail = '',
        prefillPhone = '',
        metadata = {}, // eventId, enrollmentId etc.
    }) => {
        if (!paymentConfig?.razorpayKeyId) {
            throw new Error('Payment gateway not configured by admin');
        }

        const loaded = await loadRazorpayScript();
        if (!loaded) throw new Error('Failed to load Razorpay SDK');

        setProcessing(true);

        // Create a payment record in Firestore BEFORE opening checkout
        const paymentRef = await addDoc(collection(db, 'payments'), {
            instituteId,
            amount,
            currency,
            gateway: 'razorpay',
            status: 'initiated',
            metadata,
            createdAt: new Date().toISOString(),
        });

        return new Promise((resolve, reject) => {
            const options = {
                key: paymentConfig.razorpayKeyId,
                amount: Math.round(amount * 100), // Convert to paisa
                currency,
                name,
                description,
                order_id: undefined, // Client-side — no server order (test mode compatible)
                prefill: {
                    name: prefillName,
                    email: prefillEmail,
                    contact: prefillPhone,
                },
                notes: {
                    paymentDocId: paymentRef.id,
                    ...metadata,
                },
                theme: {
                    color: '#7c3aed',
                },
                handler: async (response) => {
                    // Payment success
                    try {
                        await updateDoc(doc(db, 'payments', paymentRef.id), {
                            status: 'completed',
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpayOrderId: response.razorpay_order_id || null,
                            razorpaySignature: response.razorpay_signature || null,
                            completedAt: new Date().toISOString(),
                        });
                        setProcessing(false);
                        resolve({
                            success: true,
                            paymentId: response.razorpay_payment_id,
                            paymentDocId: paymentRef.id,
                        });
                    } catch (e) {
                        setProcessing(false);
                        reject(e);
                    }
                },
                modal: {
                    ondismiss: async () => {
                        await updateDoc(doc(db, 'payments', paymentRef.id), {
                            status: 'cancelled',
                            cancelledAt: new Date().toISOString(),
                        });
                        setProcessing(false);
                        reject(new Error('Payment cancelled by user'));
                    },
                },
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', async (response) => {
                await updateDoc(doc(db, 'payments', paymentRef.id), {
                    status: 'failed',
                    error: response.error?.description || 'Payment failed',
                    failedAt: new Date().toISOString(),
                });
                setProcessing(false);
                reject(new Error(response.error?.description || 'Payment failed'));
            });
            rzp.open();
        });
    }, [paymentConfig, instituteId]);

    return {
        paymentConfig,
        loading,
        processing,
        isPaymentConfigured,
        startRazorpayPayment,
    };
}
