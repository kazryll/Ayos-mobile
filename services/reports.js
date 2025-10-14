import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
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

export const getNearbyReports = async () => {
  try {
    const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));

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
