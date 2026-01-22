const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

/**
 * Create a new user (Auth + Firestore) without logging out the current admin.
 * Only callable by authenticated admins.
 */
exports.createUser = functions.https.onCall(async (data, context) => {
  // 1. Verify Authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }

  const callerUid = context.auth.uid;

  // 2. Verify Admin Role (Check caller's Firestore doc)
  try {
    const callerDoc = await admin.firestore().collection('users').doc(callerUid).get();
    if (!callerDoc.exists || callerDoc.data().role !== 'admin') {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only administrators can create new users.'
      );
    }
  } catch (error) {
    console.error('Error verifying admin role:', error);
    throw new functions.https.HttpsError('internal', 'Error verifying permissions.');
  }

  // 3. Extract Data
  const { email, password, name, role, type, storeId, pin } = data;

  if (!email || !password || !name) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Email, password, and name are required.'
    );
  }

  try {
    // 4. Create Auth User
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });

    // 5. Create Firestore Document
    // Use the same UID from Auth
    await admin.firestore().collection('users').doc(userRecord.uid).set({
      name,
      email,
      role: role || 'cashier',
      type: type || 'weekday',
      storeId: storeId || null,
      pin: pin || null, // Optional, for quick access if needed
      status: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: callerUid
    });

    return { 
      success: true, 
      uid: userRecord.uid,
      message: 'User created successfully'
    };

  } catch (error) {
    console.error('Error creating user:', error);
    // Return explicit error code if email exists
    if (error.code === 'auth/email-already-exists') {
      throw new functions.https.HttpsError('already-exists', 'El correo electrónico ya está registrado.');
    }
    throw new functions.https.HttpsError('internal', error.message);
  }
});
