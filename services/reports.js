import { 
  collection, 
  getDocs, 
  orderBy, 
  query, 
  where, 
  addDoc, 
  serverTimestamp,
  updateDoc // ADD THIS
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"; // ADD THIS
import { db } from "../config/firebase";

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

// MODIFY THIS FUCKING FUNCTION:
export const submitReport = async (reportData, userId = null, userEmail = null) => {
  try {
    const { images, ...otherData } = reportData;
    
    // First create the report document to get an ID
    const baseReportData = {
      ...otherData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      status: "submitted",
      ...(userId && { reportedBy: userId }),
      ...(userEmail && { userEmail: userEmail }),
    };

    const docRef = await addDoc(collection(db, "reports"), baseReportData);
    console.log("📄 Report document created with ID: ", docRef.id);
    
    let imageUrls = [];
    
    // Upload images if they exist
    if (images && images.length > 0) {
      console.log(`📤 Uploading ${images.length} images to Storage...`);
      
      const uploadPromises = images.map((imageUri, index) => 
        uploadImageToStorage(imageUri, docRef.id, index)
      );
      
      imageUrls = await Promise.all(uploadPromises);
      console.log("✅ All images uploaded to Storage");
      
      // Update the report with image URLs
      await updateDoc(docRef, {
        images: imageUrls,
        hasImages: true,
        imageCount: imageUrls.length
      });
    } else {
      // Update with empty images array
      await updateDoc(docRef, {
        images: [],
        hasImages: false,
        imageCount: 0
      });
    }
    
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