import {
    collection,
    onSnapshot,
    orderBy,
    query,
    where,
} from "firebase/firestore";
import { db } from "../config/firebase";

/**
 * Subscribe to real-time activity logs for a specific report
 * @param {string} reportId - The ID of the report to fetch logs for
 * @param {Function} callback - Callback function that receives the activity logs array
 * @returns {Function} Unsubscribe function to stop listening
 */
export const subscribeToActivityLogs = (reportId, callback) => {
  try {
    const logsRef = collection(db, "activity_logs");
    const q = query(
      logsRef,
      where("reportId", "==", reportId),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const logs = [];
        snapshot.forEach((doc) => {
          logs.push({
            id: doc.id,
            ...doc.data(),
          });
        });

        // Filter to show only citizen-relevant activities
        const citizenRelevantLogs = logs.filter((log) => {
          const relevantTypes = [
            "status_changed",
            "priority_changed",
            "reassigned",
            "comment_added",
            "note_added",
            "citizen_update",
          ];
          return relevantTypes.includes(log.type);
        });

        callback(citizenRelevantLogs);
      },
      (error) => {
        console.error("Error subscribing to activity logs:", error);
        callback([]);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error("Error setting up activity logs subscription:", error);
    return () => {};
  }
};

/**
 * Format activity log into a human-readable message
 * @param {Object} log - The activity log object
 * @returns {Object} Formatted log with title and description
 */
export const formatActivityLog = (log) => {
  const { type, metadata, actor } = log;

  let title = "";
  let description = "";
  let icon = "information-circle";
  let iconColor = "#6C757D";

  switch (type) {
    case "status_changed":
      title = "Status Updated";
      description = `Changed from ${formatStatus(
        metadata?.previousStatus
      )} to ${formatStatus(metadata?.newStatus)}`;
      if (metadata?.remarks) {
        description += `\n\nRemarks: ${metadata.remarks}`;
      }
      icon = "git-commit-outline";
      iconColor = "#3B82F6";
      break;

    case "priority_changed":
      title = "Priority Changed";
      description = `Changed from ${formatPriority(
        metadata?.previousPriority
      )} to ${formatPriority(metadata?.newPriority)}`;
      if (metadata?.remarks) {
        description += `\n\nRemarks: ${metadata.remarks}`;
      }
      icon = "flag-outline";
      iconColor = "#F59E0B";
      break;

    case "reassigned":
      title = "Report Reassigned";
      const reassignmentType = metadata?.reassignmentType || "barangay";
      if (reassignmentType === "barangay") {
        description = `Reassigned from ${
          metadata?.fromBarangay || "Unknown"
        } to ${metadata?.toBarangay || "Unknown"}`;
      } else if (reassignmentType === "city") {
        description = `Reassigned to ${metadata?.toCityOffice || "City Office"}`;
      } else {
        description = `Reassigned to ${
          metadata?.toNationalAgency || "National Agency"
        }`;
      }
      if (metadata?.reason) {
        description += `\n\nReason: ${metadata.reason}`;
      }
      icon = "swap-horizontal-outline";
      iconColor = "#8B5CF6";
      break;

    case "comment_added":
      title = "Comment Added";
      description =
        metadata?.commentPreview || "An official added a comment to this report";
      icon = "chatbubble-outline";
      iconColor = "#10B981";
      break;

    case "note_added":
      title = "Note Added";
      description = "An official added an internal note";
      if (metadata?.remarks) {
        description = metadata.remarks;
      }
      icon = "document-text-outline";
      iconColor = "#6366F1";
      break;

    case "citizen_update":
      title = "Citizen Update";
      description = metadata?.remarks || "Citizen provided an update";
      icon = "person-outline";
      iconColor = "#EC4899";
      break;

    default:
      title = "Update";
      description = "Report was updated";
      icon = "information-circle";
      iconColor = "#6C757D";
  }

  return {
    title,
    description,
    icon,
    iconColor,
    actorName: actor?.name || "System",
    actorRole: actor?.role || "",
    actorEmail: actor?.email || "",
  };
};

/**
 * Format status string for display
 */
const formatStatus = (status) => {
  if (!status) return "Unknown";
  return status
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

/**
 * Format priority string for display
 */
const formatPriority = (priority) => {
  if (!priority) return "Unknown";
  return priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase();
};

/**
 * Format timestamp as "time ago"
 * @param {Object} timestamp - Firestore Timestamp object or plain object with seconds/nanoseconds
 * @returns {string} Formatted time string
 */
export const formatTimeAgo = (timestamp) => {
  if (!timestamp) return "Unknown time";

  let date;

  // Handle Firestore Timestamp object with toDate() method
  if (timestamp.toDate && typeof timestamp.toDate === "function") {
    date = timestamp.toDate();
  }
  // Handle plain object with seconds/nanoseconds structure
  else if (timestamp.seconds !== undefined) {
    // Convert seconds to milliseconds and add nanoseconds converted to milliseconds
    const milliseconds = timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000;
    date = new Date(milliseconds);
  }
  // Fallback to treating as direct date input
  else {
    date = new Date(timestamp);
  }

  // Validate the date
  if (isNaN(date.getTime())) {
    console.warn("Invalid timestamp:", timestamp);
    return "Invalid date";
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
};
