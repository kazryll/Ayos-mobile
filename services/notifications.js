import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit as firestoreLimit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../config/firebase";

export const sendNotification = async (userId, type, payload = {}) => {
  try {
    const notif = {
      userId,
      type,
      payload,
      read: false,
      createdAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, "notifications"), notif);
    return docRef.id;
  } catch (error) {
    console.error("Error sending notification:", error);
    throw error;
  }
};

export const getNotificationsForUser = async (userId, limit = 50) => {
  try {
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    const notifs = [];
    snapshot.forEach((d) => {
      const data = d.data();
      notifs.push({
        id: d.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(),
      });
    });
    return notifs.slice(0, limit);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }
};

/**
 * Subscribe to real-time notifications for a user
 * @param {string} userId - The user ID to listen for notifications
 * @param {function} callback - Callback function that receives the notifications array
 * @param {number} limit - Maximum number of notifications to fetch (default: 50)
 * @returns {function} Unsubscribe function to stop listening
 */
export const subscribeToNotifications = (userId, callback, limit = 50) => {
  try {
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      firestoreLimit(limit)
    );

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const notifs = [];
        snapshot.forEach((d) => {
          const data = d.data();
          notifs.push({
            id: d.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || new Date(),
          });
        });
        
        // Call the callback with the updated notifications
        callback(notifs);
      },
      (error) => {
        console.error("Error in notifications listener:", error);
        // Call callback with empty array on error
        callback([]);
      }
    );

    // Return the unsubscribe function
    return unsubscribe;
  } catch (error) {
    console.error("Error setting up notifications listener:", error);
    // Return a no-op function if setup fails
    return () => {};
  }
};

export const markNotificationRead = async (notificationId) => {
  try {
    const ref = doc(db, "notifications", notificationId);
    await updateDoc(ref, { read: true });
    return true;
  } catch (error) {
    console.error("Error marking notification read:", error);
    return false;
  }
};

export const markAllNotificationsRead = async (userId) => {
  try {
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", userId)
    );
    const snapshot = await getDocs(q);
    const updates = snapshot.docs.map((d) =>
      updateDoc(doc(db, "notifications", d.id), { read: true })
    );
    await Promise.all(updates);
    return true;
  } catch (error) {
    console.error("Error marking all notifications read:", error);
    return false;
  }
};
