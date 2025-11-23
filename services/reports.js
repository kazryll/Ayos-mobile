import {
    addDoc,
    collection,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
    where
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

    const storageRef = ref(storage, `reports/${reportId}/images/image_${index}_${Date.now()}.jpg`);

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
    const { images, aiAnalysis, description, location, ...otherData } = reportData;

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
      status: "pending",                                   // "pending" | "in_progress" | "resolved" | "closed" | "rejected"

      // location object with all required fields
      location: {
        latitude: location?.latitude || 0,                 // number
        longitude: location?.longitude || 0,               // number
        address: location?.address || "Unknown",           // string
        barangay: location?.barangay || "Unknown",         // string
        city: location?.city || "Unknown",                 // string
        province: location?.province || "Unknown"          // string
      },

      images: imageUrls,                                   // string[] (Firebase Storage URLs)

      // aiGeneratedAnalysis object (AIAnalysis interface)
      aiGeneratedAnalysis: {
        title: aiAnalysis?.title || "Untitled Report",    // string
        summary: aiAnalysis?.summary || description,       // string
        category: aiAnalysis?.category || "Other",         // IssueCategory enum
        priority: aiAnalysis?.priority || "medium"         // IssuePriority enum
      },

      // Optional fields
      submittedAnonymously: !userId                        // boolean | undefined
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