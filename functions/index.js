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
