const { onCall, HttpsError, onRequest } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();
const adminAuth = getAuth();

// ═══════════════════════════════════════════════════════════
// 1. Initialize Super Admin (one-time setup)
// ═══════════════════════════════════════════════════════════
exports.initSuperAdmin = onCall({ region: "asia-south1" }, async (request) => {
    // Only allow if NO superadmin exists yet OR caller is already superadmin
    const { targetEmail } = request.data;
    if (!targetEmail) throw new HttpsError("invalid-argument", "targetEmail is required");

    // Check if any superadmin already exists
    const existingAdmins = await db.collection("superadminData").doc("config").get();
    const initialized = existingAdmins.exists && existingAdmins.data().initialized;

    if (initialized) {
        // Only existing superadmin can re-initialize
        if (!request.auth) throw new HttpsError("unauthenticated", "Login required");
        const callerToken = request.auth.token;
        if (callerToken.role !== "superadmin") {
            throw new HttpsError("permission-denied", "Only existing Super Admin can do this");
        }
    }

    // Find user by email
    let targetUser;
    try {
        targetUser = await adminAuth.getUserByEmail(targetEmail);
    } catch (e) {
        throw new HttpsError("not-found", `No user found with email: ${targetEmail}`);
    }

    // Set custom claims
    await adminAuth.setCustomUserClaims(targetUser.uid, { role: "superadmin" });

    // Also update Firestore user doc
    const userDocRef = db.collection("users").doc(targetUser.uid);
    const userDoc = await userDocRef.get();
    if (userDoc.exists) {
        await userDocRef.update({ role: "superadmin" });
    }

    // Mark as initialized
    await db.collection("superadminData").doc("config").set({
        initialized: true,
        initialSuperAdmin: targetUser.uid,
        initialEmail: targetEmail,
        createdAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    // Log activity
    await db.collection("adminLogs").add({
        action: "INIT_SUPER_ADMIN",
        targetUid: targetUser.uid,
        targetEmail: targetEmail,
        promotedBy: request.auth ? request.auth.uid : "SYSTEM_INIT",
        timestamp: FieldValue.serverTimestamp(),
    });

    return { success: true, uid: targetUser.uid, message: `${targetEmail} is now Super Admin` };
});

// ═══════════════════════════════════════════════════════════
// 2. Promote User to Super Admin (restricted)
// ═══════════════════════════════════════════════════════════
exports.promoteSuperAdmin = onCall({ region: "asia-south1" }, async (request) => {
    // Only superadmin can call
    if (!request.auth) throw new HttpsError("unauthenticated", "Login required");
    if (request.auth.token.role !== "superadmin") {
        throw new HttpsError("permission-denied", "Only Super Admin can promote");
    }

    const { targetUid } = request.data;
    if (!targetUid) throw new HttpsError("invalid-argument", "targetUid is required");

    // Get target user
    let targetUser;
    try {
        targetUser = await adminAuth.getUser(targetUid);
    } catch (e) {
        throw new HttpsError("not-found", `No user found with UID: ${targetUid}`);
    }

    // Set custom claims
    await adminAuth.setCustomUserClaims(targetUid, { role: "superadmin" });

    // Update Firestore
    const userDocRef = db.collection("users").doc(targetUid);
    if ((await userDocRef.get()).exists) {
        await userDocRef.update({ role: "superadmin" });
    }

    // Log
    await db.collection("adminLogs").add({
        action: "PROMOTE_SUPER_ADMIN",
        promotedBy: request.auth.uid,
        targetUid,
        targetEmail: targetUser.email,
        timestamp: FieldValue.serverTimestamp(),
    });

    return { success: true, message: `${targetUser.email} promoted to Super Admin` };
});

// ═══════════════════════════════════════════════════════════
// 3. Set User Role (admin/user)
// ═══════════════════════════════════════════════════════════
exports.setUserRole = onCall({ region: "asia-south1" }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Login required");
    if (request.auth.token.role !== "superadmin") {
        throw new HttpsError("permission-denied", "Only Super Admin can change roles");
    }

    const { targetUid, newRole } = request.data;
    if (!targetUid || !newRole) throw new HttpsError("invalid-argument", "targetUid and newRole required");
    if (!["user", "admin", "superadmin"].includes(newRole)) {
        throw new HttpsError("invalid-argument", "Invalid role");
    }

    await adminAuth.setCustomUserClaims(targetUid, { role: newRole });

    const userDocRef = db.collection("users").doc(targetUid);
    if ((await userDocRef.get()).exists) {
        await userDocRef.update({ role: newRole });
    }

    await db.collection("adminLogs").add({
        action: "SET_ROLE",
        promotedBy: request.auth.uid,
        targetUid,
        newRole,
        timestamp: FieldValue.serverTimestamp(),
    });

    return { success: true, message: `Role set to ${newRole}` };
});

// ═══════════════════════════════════════════════════════════
// 4. Disable/Enable User
// ═══════════════════════════════════════════════════════════
exports.toggleUserAccess = onCall({ region: "asia-south1" }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Login required");
    if (request.auth.token.role !== "superadmin") {
        throw new HttpsError("permission-denied", "Only Super Admin");
    }

    const { targetUid, disabled } = request.data;
    if (!targetUid || typeof disabled !== "boolean") {
        throw new HttpsError("invalid-argument", "targetUid and disabled (boolean) required");
    }

    await adminAuth.updateUser(targetUid, { disabled });

    await db.collection("adminLogs").add({
        action: disabled ? "DISABLE_USER" : "ENABLE_USER",
        promotedBy: request.auth.uid,
        targetUid,
        timestamp: FieldValue.serverTimestamp(),
    });

    return { success: true, message: disabled ? "User disabled" : "User enabled" };
});

// ═══════════════════════════════════════════════════════════
// 5. List All Users (paginated)
// ═══════════════════════════════════════════════════════════
exports.listAllUsers = onCall({ region: "asia-south1" }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Login required");
    if (request.auth.token.role !== "superadmin") {
        throw new HttpsError("permission-denied", "Only Super Admin");
    }

    const { pageToken, maxResults } = request.data || {};
    const listResult = await adminAuth.listUsers(maxResults || 100, pageToken || undefined);

    const users = listResult.users.map(u => ({
        uid: u.uid,
        email: u.email,
        displayName: u.displayName,
        disabled: u.disabled,
        role: u.customClaims?.role || "user",
        creationTime: u.metadata.creationTime,
        lastSignInTime: u.metadata.lastSignInTime,
    }));

    return {
        users,
        pageToken: listResult.pageToken || null,
    };
});

// ═══════════════════════════════════════════════════════════
// 6. Set Maintenance Mode
// ═══════════════════════════════════════════════════════════
exports.setMaintenanceMode = onCall({ region: "asia-south1" }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Login required");
    if (request.auth.token.role !== "superadmin") {
        throw new HttpsError("permission-denied", "Only Super Admin");
    }

    const { enabled, message } = request.data;
    await db.collection("appConfig").doc("maintenance").set({
        enabled: !!enabled,
        message: message || "System under maintenance. Please try again later.",
        updatedBy: request.auth.uid,
        updatedAt: FieldValue.serverTimestamp(),
    });

    await db.collection("adminLogs").add({
        action: enabled ? "MAINTENANCE_ON" : "MAINTENANCE_OFF",
        promotedBy: request.auth.uid,
        timestamp: FieldValue.serverTimestamp(),
    });

    return { success: true };
});

// ═══════════════════════════════════════════════════════════
// 7. Get Admin Activity Logs
// ═══════════════════════════════════════════════════════════
exports.getAdminLogs = onCall({ region: "asia-south1" }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Login required");
    if (request.auth.token.role !== "superadmin") {
        throw new HttpsError("permission-denied", "Only Super Admin");
    }

    const { limit: queryLimit } = request.data || {};
    const snap = await db.collection("adminLogs")
        .orderBy("timestamp", "desc")
        .limit(queryLimit || 50)
        .get();

    const logs = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        timestamp: d.data().timestamp?.toDate?.()?.toISOString() || null,
    }));

    return { logs };
});

// ═══════════════════════════════════════════════════════════
// 8. Force Logout All Users (revoke tokens)
// ═══════════════════════════════════════════════════════════
exports.forceLogoutAll = onCall({ region: "asia-south1" }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Login required");
    if (request.auth.token.role !== "superadmin") {
        throw new HttpsError("permission-denied", "Only Super Admin");
    }

    const listResult = await adminAuth.listUsers(1000);
    const revokePromises = listResult.users.map(u =>
        adminAuth.revokeRefreshTokens(u.uid)
    );
    await Promise.all(revokePromises);

    await db.collection("adminLogs").add({
        action: "FORCE_LOGOUT_ALL",
        promotedBy: request.auth.uid,
        usersAffected: listResult.users.length,
        timestamp: FieldValue.serverTimestamp(),
    });

    return { success: true, usersAffected: listResult.users.length };
});

// ═══════════════════════════════════════════════════════════
// 9. Create Admin (Super Admin only)
// ═══════════════════════════════════════════════════════════
exports.createAdmin = onCall({ region: "asia-south1" }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Login required");
    if (request.auth.token.role !== "superadmin") {
        throw new HttpsError("permission-denied", "Only Super Admin can create admins");
    }

    const { email, password, displayName, instituteName } = request.data;
    if (!email || !password) throw new HttpsError("invalid-argument", "Email and password required");
    if (password.length < 6) throw new HttpsError("invalid-argument", "Password must be at least 6 characters");

    // Create Firebase Auth user
    let newUser;
    try {
        newUser = await adminAuth.createUser({
            email,
            password,
            displayName: displayName || email.split('@')[0],
        });
    } catch (e) {
        throw new HttpsError("already-exists", `Could not create user: ${e.message}`);
    }

    // Set admin role
    await adminAuth.setCustomUserClaims(newUser.uid, { role: "admin" });

    // Create institute
    const instituteRef = await db.collection("institutes").add({
        name: instituteName || `${displayName || email}'s Institute`,
        createdBy: newUser.uid,
        createdAt: FieldValue.serverTimestamp(),
        status: "active",
    });

    // Create Firestore user doc
    await db.collection("users").doc(newUser.uid).set({
        name: displayName || email.split('@')[0],
        email,
        role: "admin",
        instituteId: instituteRef.id,
        instituteName: instituteName || `${displayName || email}'s Institute`,
        createdAt: FieldValue.serverTimestamp(),
        status: "active",
    });

    // Log
    await db.collection("adminLogs").add({
        action: "CREATE_ADMIN",
        createdBy: request.auth.uid,
        targetUid: newUser.uid,
        targetEmail: email,
        instituteName: instituteName || '',
        timestamp: FieldValue.serverTimestamp(),
    });

    return {
        success: true,
        uid: newUser.uid,
        instituteId: instituteRef.id,
        message: `Admin ${email} created successfully`,
    };
});

// ═══════════════════════════════════════════════════════════
// 10. Delete / Terminate Admin (Super Admin only)
// ═══════════════════════════════════════════════════════════
exports.deleteAdmin = onCall({ region: "asia-south1" }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Login required");
    if (request.auth.token.role !== "superadmin") {
        throw new HttpsError("permission-denied", "Only Super Admin");
    }

    const { targetUid, action } = request.data; // action: 'suspend' | 'terminate' | 'delete'
    if (!targetUid) throw new HttpsError("invalid-argument", "targetUid required");

    // Get target user info
    let targetUser;
    try {
        targetUser = await adminAuth.getUser(targetUid);
    } catch (e) {
        throw new HttpsError("not-found", `User not found: ${e.message}`);
    }

    // Prevent deleting superadmin
    if (targetUser.customClaims?.role === "superadmin") {
        throw new HttpsError("permission-denied", "Cannot modify a Super Admin account");
    }

    const userDocRef = db.collection("users").doc(targetUid);

    if (action === 'suspend') {
        await adminAuth.updateUser(targetUid, { disabled: true });
        await adminAuth.setCustomUserClaims(targetUid, { role: "user" });
        if ((await userDocRef.get()).exists) {
            await userDocRef.update({ role: "user", status: "suspended", suspendedAt: FieldValue.serverTimestamp() });
        }
    } else if (action === 'terminate') {
        await adminAuth.updateUser(targetUid, { disabled: true });
        await adminAuth.setCustomUserClaims(targetUid, { role: "user" });
        if ((await userDocRef.get()).exists) {
            await userDocRef.update({ role: "user", status: "terminated", terminatedAt: FieldValue.serverTimestamp() });
        }
    } else {
        // Full delete — disable account
        await adminAuth.updateUser(targetUid, { disabled: true });
        await adminAuth.setCustomUserClaims(targetUid, {});
        if ((await userDocRef.get()).exists) {
            await userDocRef.update({ role: "deleted", status: "deleted", deletedAt: FieldValue.serverTimestamp() });
        }
    }

    await db.collection("adminLogs").add({
        action: `ADMIN_${(action || 'delete').toUpperCase()}`,
        promotedBy: request.auth.uid,
        targetUid,
        targetEmail: targetUser.email,
        timestamp: FieldValue.serverTimestamp(),
    });

    return { success: true, message: `Admin ${targetUser.email} — ${action || 'deleted'}` };
});

// ═══════════════════════════════════════════════════════════
// 11. Erase Institute Data (Super Admin only, DESTRUCTIVE)
// ═══════════════════════════════════════════════════════════
exports.eraseInstituteData = onCall({ region: "asia-south1" }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Login required");
    if (request.auth.token.role !== "superadmin") {
        throw new HttpsError("permission-denied", "Only Super Admin can erase data");
    }

    const { instituteId, confirmName, confirmCode } = request.data;
    if (!instituteId || !confirmName || !confirmCode) {
        throw new HttpsError("invalid-argument", "instituteId, confirmName, and confirmCode required");
    }

    // Verify institute exists
    const instDoc = await db.collection("institutes").doc(instituteId).get();
    if (!instDoc.exists) throw new HttpsError("not-found", "Institute not found");

    // Verify confirmation name matches
    if (instDoc.data().name !== confirmName) {
        throw new HttpsError("failed-precondition", "Institute name does not match confirmation");
    }

    // Verify confirmation code
    if (confirmCode !== "ERASE-CONFIRM") {
        throw new HttpsError("failed-precondition", "Invalid confirmation code");
    }

    // Delete students for this institute
    const studentsSnap = await db.collection("students").where("instituteId", "==", instituteId).get();
    const batch1 = db.batch();
    studentsSnap.docs.forEach(d => batch1.delete(d.ref));
    if (studentsSnap.size > 0) await batch1.commit();

    // Delete batches for this institute
    const batchesSnap = await db.collection("batches").where("instituteId", "==", instituteId).get();
    const batch2 = db.batch();
    batchesSnap.docs.forEach(d => batch2.delete(d.ref));
    if (batchesSnap.size > 0) await batch2.commit();

    // Delete institute settings sub-collection
    const settingsSnap = await db.collection("institutes").doc(instituteId).collection("settings").get();
    const batch3 = db.batch();
    settingsSnap.docs.forEach(d => batch3.delete(d.ref));
    if (settingsSnap.size > 0) await batch3.commit();

    // Mark institute as erased (don't delete the doc for audit trail)
    await db.collection("institutes").doc(instituteId).update({
        status: "erased",
        erasedAt: FieldValue.serverTimestamp(),
        erasedBy: request.auth.uid,
    });

    // Log
    await db.collection("adminLogs").add({
        action: "ERASE_INSTITUTE_DATA",
        promotedBy: request.auth.uid,
        instituteId,
        instituteName: instDoc.data().name,
        studentsDeleted: studentsSnap.size,
        batchesDeleted: batchesSnap.size,
        timestamp: FieldValue.serverTimestamp(),
    });

    return {
        success: true,
        message: `Institute "${instDoc.data().name}" data erased`,
        studentsDeleted: studentsSnap.size,
        batchesDeleted: batchesSnap.size,
    };
});

// ═══════════════════════════════════════════════════════════
// 12. Create Razorpay Order
// ═══════════════════════════════════════════════════════════
exports.createRazorpayOrder = onCall({ region: "asia-south1" }, async (request) => {
    const { instituteId, amount, currency, notes, userId } = request.data || {};

    if (!amount || typeof amount !== "number" || amount <= 0) {
        throw new HttpsError("invalid-argument", "A valid amount greater than 0 is required");
    }

    try {
        let keyId, keySecret, paymentMode;

        // If instituteId is provided, load specific keys. Otherwise, fallback to global platform keys.
        if (instituteId && instituteId !== "undefined" && instituteId !== "null" && instituteId.trim() !== "") {
            // Fetch payment settings from Firestore for the specific institute
            const settingsRef = db.collection("institutes")
                .doc(instituteId)
                .collection("settings")
                .doc("payment");
            const settingsSnap = await settingsRef.get();

            if (!settingsSnap.exists) {
                throw new HttpsError("failed-precondition", "Payment gateway is not configured for this institute");
            }

            const data = settingsSnap.data();
            keyId = data.razorpayKeyId;
            keySecret = data.razorpayKeySecret;
            paymentMode = data.paymentMode;
        } else {
            // Fetch global settings
            const publicSnap = await db.collection("appConfig").doc("payment").get();
            const privateSnap = await db.collection("appConfig").doc("payment_private").get();

            if (!publicSnap.exists || !privateSnap.exists) {
                throw new HttpsError("failed-precondition", "Global payment gateway is not configured");
            }

            const publicData = publicSnap.data();
            const privateData = privateSnap.data();

            keyId = publicData.razorpayKey || publicData.razorpayKeyId;
            keySecret = privateData.razorpaySecret || privateData.razorpayKeySecret;
            paymentMode = publicData.paymentMode || "test";
        }

        if (!keyId || !keySecret) {
            throw new HttpsError("failed-precondition", "Razorpay credentials are not fully configured");
        }

        const Razorpay = require("razorpay");
        const razorpay = new Razorpay({
            key_id: keyId,
            key_secret: keySecret,
        });

        const amountInPaise = Math.round(amount * 100);
        const options = {
            amount: amountInPaise,
            currency: currency || "INR",
            receipt: `rcpt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            notes: notes || {},
        };

        const order = await razorpay.orders.create(options);

        // Save order details to Firestore
        const paymentDocData = {
            orderId: order.id,
            amount: amount, // standard amount in Rupees
            amountInPaise: order.amount,
            currency: order.currency,
            receipt: order.receipt,
            status: "created",
            mode: paymentMode || "test",
            userId: userId || null,
            createdAt: FieldValue.serverTimestamp(),
            metadata: notes || {},
        };

        if (instituteId && instituteId !== "undefined" && instituteId !== "null" && instituteId.trim() !== "") {
            await db.collection("institutes")
                .doc(instituteId)
                .collection("payments")
                .doc(order.id)
                .set(paymentDocData);
        } else {
            await db.collection("payments")
                .doc(order.id)
                .set(paymentDocData);
        }

        return {
            keyId: keyId,
            orderId: order.id,
            amount: order.amount, // in paise
            currency: order.currency,
        };
    } catch (error) {
        console.error("Error creating Razorpay order:", error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError("internal", error.message || "Failed to create Razorpay order");
    }
});

// ═══════════════════════════════════════════════════════════
// 13. Verify Razorpay Payment Signature
// ═══════════════════════════════════════════════════════════
exports.verifyRazorpayPayment = onCall({ region: "asia-south1" }, async (request) => {
    const { instituteId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = request.data || {};

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        throw new HttpsError("invalid-argument", "Missing required verification fields");
    }

    try {
        let keySecret;

        if (instituteId && instituteId !== "undefined" && instituteId !== "null" && instituteId.trim() !== "") {
            const settingsRef = db.collection("institutes")
                .doc(instituteId)
                .collection("settings")
                .doc("payment");
            const settingsSnap = await settingsRef.get();

            if (!settingsSnap.exists) {
                throw new HttpsError("failed-precondition", "Payment configuration not found");
            }

            keySecret = settingsSnap.data().razorpayKeySecret;
        } else {
            const privateSnap = await db.collection("appConfig").doc("payment_private").get();
            if (!privateSnap.exists) {
                throw new HttpsError("failed-precondition", "Global payment configuration not found");
            }
            keySecret = privateSnap.data().razorpaySecret || privateSnap.data().razorpayKeySecret;
        }

        if (!keySecret) {
            throw new HttpsError("failed-precondition", "Razorpay secret key not found");
        }

        // Verify signature
        const crypto = require("crypto");
        const generatedSignature = crypto
            .createHmac("sha256", keySecret)
            .update(razorpayOrderId + "|" + razorpayPaymentId)
            .digest("hex");

        const isValid = generatedSignature === razorpaySignature;

        const paymentRef = (instituteId && instituteId !== "undefined" && instituteId !== "null" && instituteId.trim() !== "")
            ? db.collection("institutes").doc(instituteId).collection("payments").doc(razorpayOrderId)
            : db.collection("payments").doc(razorpayOrderId);

        const paymentSnap = await paymentRef.get();

        // Avoid duplicate updates or duplicate actions if already processed
        if (paymentSnap.exists && paymentSnap.data().status === "success") {
            return { success: true };
        }

        if (isValid) {
            // Update Firestore log to success
            await paymentRef.set({
                status: "success",
                paymentId: razorpayPaymentId,
                signature: razorpaySignature,
                completedAt: FieldValue.serverTimestamp(),
            }, { merge: true });

            return { success: true };
        } else {
            // Update Firestore log to failed
            await paymentRef.set({
                status: "failed",
                paymentId: razorpayPaymentId,
                signature: razorpaySignature,
                error: "Signature verification failed",
                completedAt: FieldValue.serverTimestamp(),
            }, { merge: true });

            return { success: false, error: "Signature verification failed" };
        }
    } catch (error) {
        console.error("Error verifying Razorpay payment:", error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError("internal", error.message || "Failed to verify Razorpay payment");
    }
});

// ═══════════════════════════════════════════════════════════
// 14. Razorpay Webhook Receiver
// ═══════════════════════════════════════════════════════════
exports.razorpayWebhook = onRequest({ region: "asia-south1" }, async (req, res) => {
    // Only allow POST requests
    if (req.method !== "POST") {
        return res.status(405).send("Method Not Allowed");
    }

    const { instituteId } = req.query;
    const signature = req.headers["x-razorpay-signature"];
    if (!signature) {
        return res.status(400).send("Missing x-razorpay-signature header");
    }

    try {
        let webhookSecret;

        // If instituteId is provided, get specific webhook secret. Otherwise, get global webhook secret.
        if (instituteId && instituteId !== "undefined" && instituteId !== "null" && instituteId.trim() !== "") {
            const settingsRef = db.collection("institutes")
                .doc(instituteId)
                .collection("settings")
                .doc("payment");
            const settingsSnap = await settingsRef.get();

            if (!settingsSnap.exists) {
                return res.status(400).send("Payment settings not found for this institute");
            }

            webhookSecret = settingsSnap.data().razorpayWebhookSecret;
        } else {
            const privateSnap = await db.collection("appConfig").doc("payment_private").get();
            if (!privateSnap.exists) {
                return res.status(400).send("Global payment settings not found");
            }
            webhookSecret = privateSnap.data().razorpayWebhookSecret || privateSnap.data().razorpaySecret;
        }

        if (!webhookSecret) {
            return res.status(400).send("Webhook secret not configured");
        }

        // Verify webhook signature
        const crypto = require("crypto");
        const computedSignature = crypto
            .createHmac("sha256", webhookSecret)
            .update(req.rawBody)
            .digest("hex");

        if (computedSignature !== signature) {
            return res.status(400).send("Invalid webhook signature");
        }

        // Extract payload details
        const event = req.body.event;
        const payload = req.body.payload;

        if (event === "payment.captured") {
            const paymentEntity = payload.payment.entity;
            const orderId = paymentEntity.order_id;
            const paymentId = paymentEntity.id;
            const amountInPaise = paymentEntity.amount;

            if (orderId) {
                const paymentRef = (instituteId && instituteId !== "undefined" && instituteId !== "null" && instituteId.trim() !== "")
                    ? db.collection("institutes").doc(instituteId).collection("payments").doc(orderId)
                    : db.collection("payments").doc(orderId);
                
                const snap = await paymentRef.get();
                if (!snap.exists || snap.data().status !== "success") {
                    await paymentRef.set({
                        status: "success",
                        paymentId: paymentId,
                        amount: amountInPaise / 100,
                        amountInPaise: amountInPaise,
                        currency: paymentEntity.currency,
                        webhookVerified: true,
                        completedAt: FieldValue.serverTimestamp(),
                    }, { merge: true });
                    console.log(`Payment successful logged via Webhook: ${paymentId} for Order: ${orderId}`);
                }
            }
        } else if (event === "payment.failed") {
            const paymentEntity = payload.payment.entity;
            const orderId = paymentEntity.order_id;
            const paymentId = paymentEntity.id;
            const errorDescription = paymentEntity.error_description || "Payment failed";

            if (orderId) {
                const paymentRef = (instituteId && instituteId !== "undefined" && instituteId !== "null" && instituteId.trim() !== "")
                    ? db.collection("institutes").doc(instituteId).collection("payments").doc(orderId)
                    : db.collection("payments").doc(orderId);
                
                await paymentRef.set({
                    status: "failed",
                    paymentId: paymentId,
                    error: errorDescription,
                    webhookVerified: true,
                    completedAt: FieldValue.serverTimestamp(),
                }, { merge: true });
                console.log(`Payment failed logged via Webhook: ${paymentId} for Order: ${orderId}`);
            }
        }

        return res.status(200).send("OK");
    } catch (error) {
        console.error("Webhook processing error:", error);
        return res.status(500).send("Internal Server Error");
    }
});
