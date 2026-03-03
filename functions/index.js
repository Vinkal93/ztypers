const { onCall, HttpsError } = require("firebase-functions/v2/https");
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
