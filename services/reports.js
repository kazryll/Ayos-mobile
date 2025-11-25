import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import { db } from "../config/firebase";
import barangayBoundaries from "../data/baguioBarangayBoundaries.json";
import { findBarangayByCoordinates } from "../utils/barangayUtils";

// INITIALIZE STORAGE
const storage = getStorage();

// ADD THIS FUCKING FUNCTION RIGHT HERE:
const uploadImageToStorage = async (imageUri, reportId, index) => {
  try {
    const response = await fetch(imageUri);
    const blob = await response.blob();

    const storageRef = ref(
      storage,
      `reports/${reportId}/images/image_${index}_${Date.now()}.jpg`
    );

    const snapshot = await uploadBytes(storageRef, blob);
    const downloadURL = await getDownloadURL(snapshot.ref);

    console.log(`✅ Image ${index} uploaded to: reports/${reportId}/images/`);
    return downloadURL;
  } catch (error) {
    console.error(`❌ Error uploading image ${index}:`, error);
    throw error;
  }
};

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

/**
 * Submits a report to Firestore following the ReportData interface structure
 * @param {Object} reportData - Input report data from the wizard
 * @param {string|null} userId - The authenticated user's ID
 * @returns {Promise<string>} The created report document ID
 */
export const submitReport = async (reportData, userId = null) => {
  try {
    const { images, aiAnalysis, description, location, ...otherData } =
      reportData;

    // Upload images first if they exist
    let imageUrls = [];
    const tempReportId = `temp_${Date.now()}`;

    if (images && images.length > 0) {
      console.log(`📤 Uploading ${images.length} images to Storage...`);

      const uploadPromises = images.map((imageUri, index) =>
        uploadImageToStorage(imageUri, tempReportId, index)
      );

      imageUrls = await Promise.all(uploadPromises);
      console.log("✅ All images uploaded to Storage");
    }

    // Determine assignedTo based on barangay detection
    let assignedTo = null;
    if (location?.latitude && location?.longitude) {
      const detectedBarangay = findBarangayByCoordinates(
        location.longitude,
        location.latitude,
        barangayBoundaries
      );

      if (detectedBarangay) {
        assignedTo = `${detectedBarangay} Barangay LGU`;
        console.log(`✅ Report assigned to: ${assignedTo}`);
      } else {
        console.log("⚠️ Could not determine barangay for assignment");
      }
    }

    // Create clean report data following the ReportData interface from types/reporting.ts
    const cleanReportData = {
      // Required fields from ReportData interface
      originalDescription: description,                    // string
      reportedBy: userId || "anonymous",                   // string
      assignedTo: assignedTo,                              // string | undefined (barangay LGU based on location)
      createdAt: serverTimestamp(),                        // Firestore Timestamp
      status: "for_approval",                              // "for_approval" | "approved" | "pending" | "in_progress" | "resolved" | "closed" | "rejected"

      // location object with all required fields
      location: {
        latitude: location?.latitude || 0, // number
        longitude: location?.longitude || 0, // number
        address: location?.address || "Unknown", // string
        barangay: location?.barangay || "Unknown", // string
        city: location?.city || "Unknown", // string
        province: location?.province || "Unknown", // string
      },

      images: imageUrls, // string[] (Firebase Storage URLs)

      // aiGeneratedAnalysis object (AIAnalysis interface)
      aiGeneratedAnalysis: {
        title: aiAnalysis?.title || "Untitled Report", // string
        summary: aiAnalysis?.summary || description, // string
        category: aiAnalysis?.category || "Other", // IssueCategory enum
        priority: aiAnalysis?.priority || "medium", // IssuePriority enum
      },

      // Optional fields
      submittedAnonymously: !userId, // boolean | undefined
    };

    const docRef = await addDoc(collection(db, "reports"), cleanReportData);
    console.log("✅ Report submitted successfully with ID: ", docRef.id);

    return docRef.id;
  } catch (error) {
    console.error("❌ Error submitting report: ", error);
    throw new Error("Failed to submit report to database");
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

// Fetch all reports (feed) with optional limit
export const getAllReports = async (limit = 50) => {
  try {
    const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    const reports = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      reports.push({
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
      });
    });
    return reports.slice(0, limit);
  } catch (error) {
    console.error("Error getting all reports:", error);
    return [];
  }
};

// COMMENTS
export const addComment = async (reportId, userId, text) => {
  try {
    const comment = {
      userId,
      text,
      createdAt: serverTimestamp(),
    };

    const commentsCol = collection(db, "reports", reportId, "comments");
    const docRef = await addDoc(commentsCol, comment);

    // create a notification for the report owner
    try {
      const reportDoc = await getDoc(doc(db, "reports", reportId));
      if (reportDoc.exists()) {
        const data = reportDoc.data();
        const ownerId = data.reportedBy;
        if (ownerId && ownerId !== userId) {
          await addDoc(collection(db, "notifications"), {
            userId: ownerId,
            type: "comment",
            payload: { reportId, commentId: docRef.id, text },
            read: false,
            createdAt: serverTimestamp(),
          });
        }
      }
    } catch (notifErr) {
      console.warn("Could not create comment notification:", notifErr);
    }

    return docRef.id;
  } catch (error) {
    console.error("Error adding comment:", error);
    throw error;
  }
};

export const getComments = async (reportId) => {
  try {
    const commentsCol = collection(db, "reports", reportId, "comments");
    const snapshot = await getDocs(
      query(commentsCol, orderBy("createdAt", "asc"))
    );
    const comments = [];
    snapshot.forEach((c) => {
      const d = c.data();
      comments.push({
        id: c.id,
        ...d,
        createdAt: d.createdAt?.toDate?.() || new Date(),
      });
    });
    return comments;
  } catch (error) {
    console.error("Error getting comments:", error);
    return [];
  }
};

// Get user's current vote for a report ('up', 'down', or null)
export const getUserVoteForReport = async (reportId, userId) => {
  try {
    const voteDocId = `${reportId}_${userId}`;
    const voteDocRef = doc(db, "reportVotes", voteDocId);
    const voteSnap = await getDoc(voteDocRef);
    
    if (voteSnap.exists()) {
      return voteSnap.data().vote; // returns 'up' or 'down'
    }
    return null; // no vote
  } catch (error) {
    console.warn("Error getting user vote:", error);
    return null;
  }
};

// VOTING: upvote/downvote with single-vote-per-user enforcement
export const voteReport = async (reportId, userId, voteType) => {
  // voteType: 'up' | 'down'
  try {
    const voteDocId = `${reportId}_${userId}`;
    const voteDocRef = doc(db, "reportVotes", voteDocId);
    const reportRef = doc(db, "reports", reportId);

    // First, check if report exists
    const reportSnap = await getDoc(reportRef);
    if (!reportSnap.exists()) throw new Error("Report not found");

    // Get current vote state
    const voteSnap = await getDoc(voteDocRef);
    const prevVote = voteSnap.exists() ? voteSnap.data().vote : null;

    // Handle toggle off (same vote clicked)
    if (prevVote === voteType) {
      console.log(`⬜ Toggling off ${voteType} vote`);
      // Delete the vote
      await deleteDoc(voteDocRef);
      // Decrement the counter
      if (voteType === "up") {
        await updateDoc(reportRef, { upvotes: increment(-1) });
      } else {
        await updateDoc(reportRef, { downvotes: increment(-1) });
      }
    } else {
      // Handle vote creation or switching
      console.log(`📝 Creating ${voteType} vote (prev: ${prevVote || "none"})`);

      // If switching votes, decrement the old one
      if (prevVote === "up") {
        await updateDoc(reportRef, { upvotes: increment(-1) });
      } else if (prevVote === "down") {
        await updateDoc(reportRef, { downvotes: increment(-1) });
      }

      // Create the vote document - use setDoc without merge to force CREATE operation
      const voteData = { vote: voteType, userId, reportId };
      if (voteSnap.exists()) {
        // Document exists, use updateDoc
        await updateDoc(voteDocRef, voteData);
      } else {
        // Document doesn't exist, use setDoc to CREATE
        await setDoc(voteDocRef, voteData);
      }

      // Increment the new vote
      if (voteType === "up") {
        await updateDoc(reportRef, { upvotes: increment(1) });
      } else {
        await updateDoc(reportRef, { downvotes: increment(1) });
      }
    }

    // Create notification for upvote
    if (voteType === "up" && prevVote !== "up") {
      try {
        const reportData = reportSnap.data();
        const ownerId = reportData.reportedBy;
        if (ownerId && ownerId !== userId) {
          await addDoc(collection(db, "notifications"), {
            userId: ownerId,
            type: "upvote",
            payload: { reportId },
            read: false,
            createdAt: serverTimestamp(),
          });
        }
      } catch (notifErr) {
        console.warn("Could not create upvote notification:", notifErr);
      }
    }

    return true;
  } catch (error) {
    console.error("Error voting report:", error);
    throw error;
  }
};

// Update report status and maintain verifiedReportCount on the user
export const updateReportStatus = async (reportId, newStatus) => {
  try {
    const reportRef = doc(db, "reports", reportId);
    const reportSnap = await getDoc(reportRef);
    if (!reportSnap.exists()) throw new Error("Report not found");
    const data = reportSnap.data();
    const prevStatus = data.status;
    const ownerId = data.reportedBy;

    await updateDoc(reportRef, {
      status: newStatus,
      updatedAt: serverTimestamp(),
    });

    // If moved to 'resolved' from non-resolved, increment user's verifiedReportCount
    if (prevStatus !== "resolved" && newStatus === "resolved" && ownerId) {
      const userRef = doc(db, "users", ownerId);
      await updateDoc(userRef, { verifiedReportCount: increment(1) });

      // notify owner about verification
      try {
        await addDoc(collection(db, "notifications"), {
          userId: ownerId,
          type: "verified",
          payload: { reportId },
          read: false,
          createdAt: serverTimestamp(),
        });
      } catch (notifErr) {
        console.warn("Could not create verification notification:", notifErr);
      }
    }

    // If was resolved and now not, decrement
    if (prevStatus === "resolved" && newStatus !== "resolved" && ownerId) {
      const userRef = doc(db, "users", ownerId);
      await updateDoc(userRef, { verifiedReportCount: increment(-1) });
    }

    return true;
  } catch (error) {
    console.error("Error updating report status:", error);
    throw error;
  }
};
