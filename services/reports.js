import { 
  collection, 
  getDocs, 
  orderBy, 
  query, 
  where, 
  addDoc, 
  serverTimestamp 
} from "firebase/firestore";
import { db } from "../config/firebase";

export const getUserReports = async (userId) => {
  try {
    const q = query(
      collection(db, "reports"),
      where("reportedBy", "==", userId),
      orderBy("createdAt", "desc")
    );

    const querySnapshot = await getDocs(q);
    const reports = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      reports.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
      });
    });

    return reports;
  } catch (error) {
    console.error("Error getting user reports:", error);
    return [];
  }
};

// FIXED: Added userId and userEmail as parameters
export const submitReport = async (reportData, userId = null, userEmail = null) => {
  try {
    const reportWithMetadata = {
      ...reportData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      status: "submitted",
      // Only include user data if provided (for anonymous submissions)
      ...(userId && { reportedBy: userId }),
      ...(userEmail && { userEmail: userEmail }),
    };

    const docRef = await addDoc(
      collection(db, "reports"),
      reportWithMetadata
    );
    console.log("✅ Report submitted with ID: ", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("❌ Error submitting report: ", error);
    throw new Error("Failed to submit report to database");
  }
};

export const getNearbyReports = async () => {
  try {
    const q = query(
      collection(db, "reports"),
      orderBy("createdAt", "desc")
    );

    const querySnapshot = await getDocs(q);
    const reports = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      reports.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
      });
    });

    return reports.slice(0, 5);
  } catch (error) {
    console.error("Error getting nearby reports:", error);
    return [];
  }
};