import { collection, addDoc, query, where, orderBy, getDocs, updateDoc, doc, serverTimestamp } from "firebase/firestore";
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
      notifs.push({ id: d.id, ...data, createdAt: data.createdAt?.toDate?.() || new Date() });
    });
    return notifs.slice(0, limit);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return [];
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
    const q = query(collection(db, "notifications"), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    const updates = snapshot.docs.map((d) => updateDoc(doc(db, "notifications", d.id), { read: true }));
    await Promise.all(updates);
    return true;
  } catch (error) {
    console.error("Error marking all notifications read:", error);
    return false;
  }
};
