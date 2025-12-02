import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { getUserReports } from "./reports";

export const getUserStats = async (userId) => {
  try {
    const reports = await getUserReports(userId);

    return {
      totalReports: reports.length,
      pendingReports: reports.filter((r) => r.status === "in-progress").length,
      inProgressReports: reports.filter((r) => r.status === "in-progress")
        .length,
      resolvedReports: reports.filter((r) => r.status === "resolved").length,
    };
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

// Leaderboard: compute points based on LGU-verified reports
// Rule: 0.2 points per report that is marked as 'resolved' (LGU verified)
export const getLeaderboard = async (limit = 50) => {
  try {
    // Query reports that have status 'resolved' (assumed LGU-verified)
    const q = query(
      collection(db, "reports"),
      where("status", "==", "resolved")
    );
    const snapshot = await getDocs(q);

    // Aggregate counts by userId
    const counts = {};
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const userId = data.reportedBy || data.userId || null;
      if (!userId) return;
      counts[userId] = (counts[userId] || 0) + 1;
    });

    // Build leaderboard entries by fetching user profiles
    const entries = await Promise.all(
      Object.keys(counts).map(async (uid) => {
        const profile = await getUserProfile(uid);
        return {
          userId: uid,
          displayName:
            (profile && (profile.displayName || profile.name)) || "Unknown",
          avatarUrl: profile?.photoURL || null,
          verifiedReports: counts[uid],
          points: +(counts[uid] * 0.2).toFixed(2),
        };
      })
    );

    // Sort descending by points (then by reports)
    entries.sort(
      (a, b) => b.points - a.points || b.verifiedReports - a.verifiedReports
    );

    return entries.slice(0, limit);
  } catch (error) {
    console.error("Error building leaderboard:", error);
    return [];
  }
};
