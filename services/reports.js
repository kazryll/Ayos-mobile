import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy,
  onSnapshot 
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';

// Get user's reports
export const getUserReports = async (userId) => {
  try {
    const q = query(
      collection(db, 'reports'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const reports = [];
    
    querySnapshot.forEach((doc) => {
      reports.push({ 
        id: doc.id, 
        ...doc.data(),
        // Convert Firestore timestamp to readable date
        createdAt: doc.data().createdAt?.toDate() || new Date()
      });
    });
    
    return reports;
  } catch (error) {
    console.error('Error getting user reports:', error);
    throw error;
  }
};

// Get all reports for "Issues Near You" (mock location for now)
export const getNearbyReports = async () => {
  try {
    const q = query(
      collection(db, 'reports'),
      orderBy('createdAt', 'desc'),
      // where('location.city', '==', 'Baguio City') // We'll add location later
    );
    
    const querySnapshot = await getDocs(q);
    const reports = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      reports.push({ 
        id: doc.id, 
        ...data,
        createdAt: data.createdAt?.toDate() || new Date()
      });
    });
    
    return reports.slice(0, 5); // Return only 5 most recent
  } catch (error) {
    console.error('Error getting nearby reports:', error);
    throw error;
  }
};

// Real-time listener for user's reports
export const subscribeToUserReports = (userId, callback) => {
  const q = query(
    collection(db, 'reports'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const reports = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      reports.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date()
      });
    });
    callback(reports);
  });
};