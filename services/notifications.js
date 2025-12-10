import {
    addDoc,
    collection,
    doc,
    limit as firestoreLimit,
    getDoc,
    getDocs,
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

/**
 * Subscribe to activity logs for a user's reports and create notifications
 * @param {string} userId - The user ID to monitor reports for
 * @returns {function} Unsubscribe function to stop listening
 */
export const subscribeToActivityNotifications = (userId) => {
  try {
    // Track processed activity logs to avoid duplicates
    const processedActivityLogs = new Set();
    let isInitialLoad = true;

    // First, get all reports for this user to monitor their activity logs
    const reportsQuery = query(
      collection(db, "reports"),
      where("userId", "==", userId)
    );

    // Listen to user's reports
    const unsubscribeReports = onSnapshot(
      reportsQuery,
      (reportsSnapshot) => {
        const reportIds = [];
        reportsSnapshot.forEach((reportDoc) => {
          reportIds.push(reportDoc.id);
        });

        // If user has no reports, nothing to monitor
        if (reportIds.length === 0) {
          return;
        }

        // Listen to activity logs for these reports
        const activityQuery = query(
          collection(db, "activity_logs"),
          where("reportId", "in", reportIds.slice(0, 10)), // Firestore 'in' limit is 10
          orderBy("timestamp", "desc")
        );

        // Set up listener for activity logs
        const unsubscribeActivity = onSnapshot(
          activityQuery,
          async (activitySnapshot) => {
            // On initial load, mark all existing docs as processed
            if (isInitialLoad) {
              activitySnapshot.forEach((doc) => {
                processedActivityLogs.add(doc.id);
              });
              isInitialLoad = false;
              console.log(`📋 Initial load: ${processedActivityLogs.size} activity logs marked as seen`);
              return;
            }

            // Process new activity logs (only new ones after initial load)
            activitySnapshot.docChanges().forEach(async (change) => {
              if (change.type === "added" && !processedActivityLogs.has(change.doc.id)) {
                processedActivityLogs.add(change.doc.id);
                const activityLog = change.doc.data();

                console.log(`🔔 New activity log detected:`, {
                  id: change.doc.id,
                  type: activityLog.type,
                  reportId: activityLog.reportId,
                });

                // Only create notifications for citizen-relevant activities
                const citizenRelevantTypes = [
                  "status_changed",
                  "priority_changed",
                  "reassigned",
                  "comment_added",
                  "note_added",
                  "citizen_update"
                ];

                if (citizenRelevantTypes.includes(activityLog.type)) {
                  // Get report details to include in notification
                  const reportDoc = await getDoc(doc(db, "reports", activityLog.reportId));
                  const reportData = reportDoc.exists() ? reportDoc.data() : null;

                  // Create notification based on activity type
                  let notificationType = "report_update";
                  let notificationTitle = "";
                  let notificationMessage = "";

                  switch (activityLog.type) {
                    case "status_changed":
                      notificationType = "status_update";
                      notificationTitle = "Report Status Updated";
                      notificationMessage = `Your report "${reportData?.aiGeneratedAnalysis?.title || 'Untitled'}" status changed to ${activityLog.changes?.newStatus || 'updated'}`;
                      if (activityLog.metadata?.remarks) {
                        notificationMessage += `: ${activityLog.metadata.remarks}`;
                      }
                      break;

                    case "priority_changed":
                      notificationType = "priority_update";
                      notificationTitle = "Report Priority Changed";
                      notificationMessage = `Your report "${reportData?.aiGeneratedAnalysis?.title || 'Untitled'}" priority changed to ${activityLog.changes?.newPriority || 'updated'}`;
                      if (activityLog.metadata?.reason) {
                        notificationMessage += `: ${activityLog.metadata.reason}`;
                      }
                      break;

                    case "reassigned":
                      notificationType = "report_reassigned";
                      notificationTitle = "Report Reassigned";
                      const assignmentType = activityLog.metadata?.assignmentType || "unknown";
                      notificationMessage = `Your report "${reportData?.aiGeneratedAnalysis?.title || 'Untitled'}" was reassigned to ${assignmentType} level`;
                      if (activityLog.metadata?.reason) {
                        notificationMessage += `: ${activityLog.metadata.reason}`;
                      }
                      break;

                    case "comment_added":
                      notificationType = "new_comment";
                      notificationTitle = "New Comment on Report";
                      const actorName = activityLog.actor?.name || "An official";
                      notificationMessage = `${actorName} commented on your report "${reportData?.aiGeneratedAnalysis?.title || 'Untitled'}"`;
                      if (activityLog.metadata?.commentPreview) {
                        notificationMessage += `: "${activityLog.metadata.commentPreview}"`;
                      }
                      break;

                    case "note_added":
                      notificationType = "new_note";
                      notificationTitle = "Note Added to Report";
                      notificationMessage = `A note was added to your report "${reportData?.aiGeneratedAnalysis?.title || 'Untitled'}"`;
                      if (activityLog.metadata?.notePreview) {
                        notificationMessage += `: "${activityLog.metadata.notePreview}"`;
                      }
                      break;

                    case "citizen_update":
                      notificationType = "citizen_update";
                      notificationTitle = "Update on Your Report";
                      notificationMessage = activityLog.metadata?.message || `There's an update on your report "${reportData?.aiGeneratedAnalysis?.title || 'Untitled'}"`;
                      break;

                    default:
                      notificationTitle = "Report Update";
                      notificationMessage = `There's an update on your report "${reportData?.aiGeneratedAnalysis?.title || 'Untitled'}"`;
                  }

                  // Send the notification
                  await sendNotification(userId, notificationType, {
                    title: notificationTitle,
                    message: notificationMessage,
                    reportId: activityLog.reportId,
                    activityLogId: change.doc.id,
                    actorName: activityLog.actor?.name,
                    actorRole: activityLog.actor?.role,
                    timestamp: activityLog.timestamp,
                  });
                }
              }
            });
          },
          (error) => {
            console.error("Error in activity logs listener:", error);
          }
        );
      },
      (error) => {
        console.error("Error in reports listener:", error);
      }
    );

    // Return unsubscribe function
    return unsubscribeReports;
  } catch (error) {
    console.error("Error setting up activity notifications:", error);
    return () => {};
  }
};
