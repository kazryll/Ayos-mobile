import theme from "@/config/theme";
import {
  addComment,
  getAllReports,
  getComments,
  getUserVoteForReport,
  voteReport,
} from "@/services/reports";
import { getUserProfile } from "@/services/userService";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import BottomNav from "../components/BottomNav";
import { auth } from "../config/firebase";

const arrowUpwardOutline = require("@/assets/icons/arrow-upward-outline.png");
const arrowUpwardBold = require("@/assets/icons/arrow-upward-bold.png");
const arrowDownwardOutline = require("@/assets/icons/arrow-downward-outline.png");
const arrowDownwardBold = require("@/assets/icons/arrow-downward-bold.png");
const commentOutline = require("@/assets/icons/comment-outline.png");
const commentBold = require("@/assets/icons/comment-bold.png");
const chartBarIcon = require("@/assets/icons/chart-bar.png");

const HERO_HEIGHT = Dimensions.get("window").height * 0.1;

const statusFilters = [
  { key: "all", label: "All" },
  { key: "for_approval", label: "For Approval" },
  { key: "pending", label: "Pending" },
  { key: "in-progress", label: "In-Progress" },
  { key: "approved", label: "Approved" },
  { key: "resolved", label: "Resolved" },
];

const statusColors: Record<string, string> = {
  for_approval: "#F5A524",
  pending: "#FBC02D",
  "in-progress": "#42A5F5",
  approved: "#00B894",
  resolved: "#2ECC71",
  default: "#B0BEC5",
};

export default function ReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [userVotes, setUserVotes] = useState<{ [key: string]: string }>({});
  const [submittingVote, setSubmittingVote] = useState<{ [key: string]: boolean }>({});
  const [commentingReportId, setCommentingReportId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [reportComments, setReportComments] = useState<{ [key: string]: any[] }>({});
  const [commentsLoading, setCommentsLoading] = useState<{ [key: string]: boolean }>({});
  const [commentCounts, setCommentCounts] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const all = await getAllReports(0);
      const withAuthors = await Promise.all(
        all.map(async (r: any) => {
          try {
            const profile = r.reportedBy
              ? await getUserProfile(r.reportedBy)
              : null;
            return {
              ...r,
              authorName:
                profile?.displayName || profile?.name || r.reportedBy || "User",
            };
          } catch (e) {
            console.warn("Could not load profile for report:", r.id, e);
            return { ...r, authorName: r.reportedBy || "User" };
          }
        })
      );
      setReports(withAuthors || []);
      setReportComments({});
      setUserVotes({});
      setCommentCounts({});
      await preloadUserVotes(withAuthors);
      await preloadCommentCounts(withAuthors);
    } catch (e) {
      console.error(e);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const preloadUserVotes = async (list: any[]) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        setUserVotes({});
        return;
      }
      const votesMap: { [key: string]: string } = {};
      for (const report of list) {
        try {
          const vote = await getUserVoteForReport(report.id, user.uid);
          if (vote) {
            votesMap[report.id] = vote;
          }
        } catch (err) {
          console.warn("Could not load vote for report", report.id, err);
        }
      }
      setUserVotes(votesMap);
    } catch (err) {
      console.warn("Failed to preload votes:", err);
    }
  };

  const preloadCommentCounts = async (list: any[]) => {
    try {
      const countsEntries = await Promise.all(
        list.map(async (report) => {
          try {
            const comments = await getComments(report.id);
            return [report.id, comments.length] as [string, number];
          } catch (error) {
            console.warn("Could not load comment count for report:", report.id, error);
            return [report.id, 0] as [string, number];
          }
        })
      );
      const counts: { [key: string]: number } = {};
      for (const [id, count] of countsEntries) {
        counts[id] = count;
      }
      setCommentCounts(counts);
    } catch (error) {
      console.warn("Failed to preload comment counts:", error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReports();
    setRefreshing(false);
  };

  const filteredReports = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const applyStatus = (reportStatus: string) => {
      if (statusFilter === "all") return true;
      return (reportStatus || "pending").toLowerCase() === statusFilter;
    };

    return reports
      .filter((report) => {
        const normalizedStatus = (report.status || "pending").toLowerCase();
        if (!applyStatus(normalizedStatus)) return false;

        if (!q) return true;
        const haystack = [
          report.aiGeneratedAnalysis?.title,
          report.aiGeneratedAnalysis?.summary,
          report.originalDescription,
          report.location?.address,
          report.authorName,
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }, [reports, searchQuery, statusFilter]);

  const handleVote = async (reportId: string, voteType: "up" | "down") => {
    if (submittingVote[reportId]) return;
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Sign in required", "Please sign in to vote on reports.");
      return;
    }

    const prevVote = userVotes[reportId] || null;
    const newVote = prevVote === voteType ? null : voteType;

    setSubmittingVote((prev) => ({ ...prev, [reportId]: true }));

    setUserVotes((prev) => {
      const next = { ...prev };
      if (newVote === null) {
        delete next[reportId];
      } else {
        next[reportId] = newVote;
      }
      return next;
    });

    setReports((prev) =>
      prev.map((report) => {
        if (report.id !== reportId) return report;
        let up = report.upvotes || 0;
        let down = report.downvotes || 0;

        if (prevVote === "up") up = Math.max(0, up - 1);
        if (prevVote === "down") down = Math.max(0, down - 1);
        if (newVote === "up") up += 1;
        if (newVote === "down") down += 1;

        return { ...report, upvotes: up, downvotes: down };
      })
    );

    try {
      await voteReport(reportId, user.uid, voteType);
    } catch (err) {
      console.error("Error voting on report:", err);
      setUserVotes((prev) => {
        const reverted = { ...prev };
        if (prevVote === null) {
          delete reverted[reportId];
        } else {
          reverted[reportId] = prevVote;
        }
        return reverted;
      });
      setReports((prev) =>
        prev.map((report) => {
          if (report.id !== reportId) return report;
          let up = report.upvotes || 0;
          let down = report.downvotes || 0;

          if (newVote === "up") up = Math.max(0, up - 1);
          if (newVote === "down") down = Math.max(0, down - 1);
          if (prevVote === "up") up += 1;
          if (prevVote === "down") down += 1;

          return { ...report, upvotes: up, downvotes: down };
        })
      );
      Alert.alert("Error", "Failed to update vote. Please try again.");
    } finally {
      setSubmittingVote((prev) => ({ ...prev, [reportId]: false }));
    }
  };

  const loadCommentsForReport = async (reportId: string) => {
    setCommentsLoading((prev) => ({ ...prev, [reportId]: true }));
    try {
      const comments = await getComments(reportId);
      const enriched = await Promise.all(
        comments.map(async (comment: any) => {
          try {
            const profile = comment.userId
              ? await getUserProfile(comment.userId)
              : null;
            const authorName =
              profile?.displayName ||
              profile?.name ||
              (comment.userId ? comment.userId.split("@")[0] : "Anonymous");
            return { ...comment, authorName };
          } catch (err) {
            console.warn("Could not load commenter profile:", err);
            return {
              ...comment,
              authorName: comment.userId
                ? comment.userId.split("@")[0]
                : "Anonymous",
            };
          }
        })
      );
      setReportComments((prev) => ({ ...prev, [reportId]: enriched }));
      setCommentCounts((prev) => ({ ...prev, [reportId]: enriched.length }));
    } catch (err) {
      console.warn("Failed to load comments:", err);
      Alert.alert("Error", "Unable to load comments right now.");
    } finally {
      setCommentsLoading((prev) => ({ ...prev, [reportId]: false }));
    }
  };

  const handleToggleComments = async (reportId: string) => {
    if (commentingReportId === reportId) {
      setCommentingReportId(null);
      setCommentText("");
      return;
    }
    setCommentingReportId(reportId);
    setCommentText("");
    if (!reportComments[reportId]) {
      await loadCommentsForReport(reportId);
    }
  };

  const handleSubmitComment = async () => {
    if (!commentingReportId) return;
    const text = commentText.trim();
    if (!text) return;
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Sign in required", "Please sign in to comment.");
      return;
    }
    setSubmittingComment(true);
    try {
      await addComment(commentingReportId, user.uid, text);
      setCommentText("");
      await loadCommentsForReport(commentingReportId);
      setCommentCounts((prev) => {
        const next = { ...prev };
        next[commentingReportId] = (next[commentingReportId] || 0) + 1;
        return next;
      });
    } catch (err) {
      console.error("Error adding comment:", err);
      Alert.alert("Error", "Failed to add comment. Please try again.");
    } finally {
      setSubmittingComment(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const votes = (item.upvotes || 0) + (item.downvotes || 0);
    const statusKey = (item.status || "pending").toLowerCase();
    const badgeColor = statusColors[statusKey] || statusColors.default;
    const userVote = userVotes[item.id];
    const commentsOpen = commentingReportId === item.id;
    const statusLabel = (item.status || "pending")
      .split("-")
      .map(
        (segment: string) => segment.charAt(0).toUpperCase() + segment.slice(1)
      )
      .join(" ");

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>
              {item.aiGeneratedAnalysis?.title ||
                item.originalDescription?.slice(0, 80) ||
                "Untitled report"}
            </Text>
            <Text style={styles.cardMeta}>
              {item.authorName} •{" "}
              {item.location?.address || "Unknown location"}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: badgeColor }]}>
            <Text style={styles.statusBadgeText}>{statusLabel}</Text>
          </View>
        </View>

        <Text style={styles.cardSummary}>
          {item.aiGeneratedAnalysis?.summary || item.originalDescription}
        </Text>

        <View style={styles.cardMetaRow}>
          <View style={styles.footerPill}>
            <Image
              source={chartBarIcon}
              style={{ width: 16, height: 16, marginRight: 6 }}
            />
            <Text style={styles.footerPillText}>{votes} votes</Text>
          </View>
          <Text style={styles.cardDate}>
            {new Date(item.createdAt).toLocaleString()}
          </Text>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.voteButton}
            onPress={() => handleVote(item.id, "up")}
            disabled={submittingVote[item.id]}
          >
            <Image
              source={userVote === "up" ? arrowUpwardBold : arrowUpwardOutline}
              style={[
                styles.voteIcon,
                userVote === "up" && styles.voteIconActive,
              ]}
            />
            <Text
              style={[
                styles.voteCount,
                userVote === "up" && styles.voteCountActive,
              ]}
            >
              {item.upvotes || 0}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.voteButton}
            onPress={() => handleVote(item.id, "down")}
            disabled={submittingVote[item.id]}
          >
            <Image
              source={
                userVote === "down" ? arrowDownwardBold : arrowDownwardOutline
              }
              style={[
                styles.voteIcon,
                userVote === "down" && styles.voteIconActive,
              ]}
            />
            <Text
              style={[
                styles.voteCount,
                userVote === "down" && styles.voteCountActive,
              ]}
            >
              {item.downvotes || 0}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.commentButton}
            onPress={() => handleToggleComments(item.id)}
          >
            <Image
              source={commentsOpen ? commentBold : commentOutline}
              style={styles.commentIcon}
            />
            <Text
              style={[
                styles.commentText,
                commentsOpen && styles.commentTextActive,
              ]}
            >
              {(commentCounts[item.id] ?? 0).toString()}
            </Text>
          </TouchableOpacity>
        </View>

        {commentsOpen && (
          <View style={styles.commentsSection}>
            <Text style={styles.commentsSectionTitle}>Comments</Text>
            {commentsLoading[item.id] ? (
              <ActivityIndicator color={theme.Colors.primary} size="small" />
            ) : (
              (reportComments[item.id] || []).map((comment) => (
                <View key={comment.id} style={styles.commentItem}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentAuthor}>
                      {comment.authorName || "User"}
                    </Text>
                    <Text style={styles.commentDate}>
                      {comment.createdAt?.toLocaleString
                        ? comment.createdAt.toLocaleString()
                        : new Date(comment.createdAt).toLocaleString()}
                    </Text>
                  </View>
                  <Text style={styles.commentBody}>{comment.text}</Text>
                </View>
              ))
            )}

            <TextInput
              style={styles.commentInput}
              placeholder="Add a comment..."
              placeholderTextColor="#94A3B8"
              value={commentText}
              multiline
              onChangeText={setCommentText}
            />
            <View style={styles.commentActions}>
              <TouchableOpacity
                style={styles.commentCancel}
                onPress={() => {
                  setCommentingReportId(null);
                  setCommentText("");
                }}
              >
                <Text style={styles.commentCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.commentSubmit,
                  (!commentText.trim() || submittingComment) &&
                    styles.commentSubmitDisabled,
                ]}
                disabled={!commentText.trim() || submittingComment}
                onPress={handleSubmitComment}
              >
                <Text style={styles.commentSubmitText}>
                  {submittingComment ? "Posting..." : "Post"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderHeader = () => (
    <>
      <LinearGradient
        colors={[theme.Colors.primary, theme.Colors.primaryLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.heroTitle}>Community Reports</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <View style={styles.searchSection}>
        <TextInput
          placeholder="Search by location, keyword, or reporter"
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
        />
      </View>

      <View style={styles.filterBar}>
        <ScrollChips
          items={statusFilters}
          activeKey={statusFilter}
          onSelect={setStatusFilter}
        />
      </View>
    </>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.Colors.primary} />
        <Text style={{ marginTop: 12 }}>Loading reports...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredReports}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.Colors.primary]}
            tintColor={theme.Colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No reports found</Text>
            <Text style={styles.emptySubtitle}>
              Try adjusting your filters or search keywords.
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
      />

      <BottomNav />
    </View>
  );
}

const ScrollChips = ({
  items,
  activeKey,
  onSelect,
}: {
  items: { key: string; label: string }[];
  activeKey: string;
  onSelect: (key: string) => void;
}) => (
  <FlatList
    data={items}
    keyExtractor={(item) => item.key}
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={{ paddingHorizontal: 20 }}
    renderItem={({ item, index }) => (
      <TouchableOpacity
        style={[
          styles.filterChip,
          { marginRight: index === items.length - 1 ? 0 : 8 },
          activeKey === item.key && styles.filterChipActive,
        ]}
        onPress={() => onSelect(item.key)}
      >
        <Text
          style={[
            styles.filterChipText,
            activeKey === item.key && styles.filterChipTextActive,
          ]}
        >
          {item.label}
        </Text>
      </TouchableOpacity>
    )}
  />
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.Colors.background },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  hero: {
    height: HERO_HEIGHT,
    minHeight: 70,
    paddingHorizontal: 20,
    justifyContent: "center",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  heroTitle: {
    flex: 1,
    textAlign: "center",
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  searchSection: { paddingHorizontal: 20, paddingTop: 16 },
  searchInput: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    fontSize: 15,
    color: "#0F172A",
  },
  filterBar: {
    marginTop: 12,
    paddingBottom: 4,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#CBD5F5",
    backgroundColor: "#fff",
  },
  filterChipActive: {
    backgroundColor: theme.Colors.primary,
    borderColor: theme.Colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: "#fff",
  },
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 12,
    color: "#64748B",
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  statusBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  cardSummary: {
    color: "#1E293B",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  cardMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  footerPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  footerPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0F172A",
  },
  cardDate: {
    fontSize: 12,
    color: "#94A3B8",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E2E8F0",
    paddingVertical: 12,
    marginBottom: 12,
  },
  voteButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  voteIcon: {
    width: 24,
    height: 24,
    tintColor: "#94A3B8",
    marginRight: 6,
  },
  voteIconActive: {
    tintColor: theme.Colors.primary,
  },
  voteCount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
  },
  voteCountActive: {
    color: theme.Colors.primary,
  },
  commentButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  commentIcon: {
    width: 22,
    height: 22,
    tintColor: "#94A3B8",
    marginRight: 6,
  },
  commentText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
  },
  commentTextActive: {
    color: theme.Colors.primary,
  },
  commentsSection: {
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 12,
    marginTop: 4,
  },
  commentsSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 10,
  },
  commentItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  commentAuthor: {
    fontWeight: "600",
    color: "#0F172A",
  },
  commentDate: {
    fontSize: 11,
    color: "#94A3B8",
  },
  commentBody: {
    color: "#1E293B",
    lineHeight: 18,
    fontSize: 13,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 12,
    minHeight: 80,
    textAlignVertical: "top",
    color: "#0F172A",
  },
  commentActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 10,
  },
  commentCancel: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#E2E8F0",
  },
  commentCancelText: {
    color: "#475569",
    fontWeight: "600",
  },
  commentSubmit: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: theme.Colors.primary,
  },
  commentSubmitDisabled: {
    backgroundColor: "#A7C5B5",
  },
  commentSubmitText: {
    color: "#fff",
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    paddingHorizontal: 32,
  },
});
