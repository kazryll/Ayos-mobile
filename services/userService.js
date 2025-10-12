import { doc, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { getUserReports } from "./reports";

// Get user stats for the home screen
export const getUserStats = async (userId) => {
  try {
    const reports = await getUserReports(userId);

    const stats = {
      totalReports: reports.length,
      pendingReports: reports.filter((r) => r.status === "pending").length,
      inProgressReports: reports.filter((r) => r.status === "in-progress")
        .length,
      resolvedReports: reports.filter((r) => r.status === "resolved").length,
    };

    return stats;
  } catch (error) {
    console.error("Error getting user stats:", error);
    return {
      totalReports: 0,
      pendingReports: 0,
      inProgressReports: 0,
      resolvedReports: 0,
    };
  }
};

// Get user profile data
export const getUserProfile = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (userDoc.exists()) {
      return userDoc.data();
    }
    return null;
  } catch (error) {
    console.error("Error getting user profile:", error);
    return null;
  }
};
