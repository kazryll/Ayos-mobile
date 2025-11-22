// components/IssueReportingWizard.tsx

import { LinearGradient } from "expo-linear-gradient";
import { onAuthStateChanged } from "firebase/auth";
import React, { JSX, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Easing,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { auth } from "../config/firebase";
import theme from "../config/theme";
import { analyzeIssueWithAI, generateReportTitle } from "../services/groqServices";
import { submitReport } from "../services/reports";
import {
    AIAnalysis,
    IssueCategory,
    IssuePriority,
    ReportData,
    WizardStep,
} from "../types/reporting";
import LocationPinner from "./LocationPinner";
import ReviewSubmitStep from "./ReviewSubmitStep";

interface IssueReportingWizardProps {
  onClose: () => void;
}

const IssueReportingWizard: React.FC<IssueReportingWizardProps> = ({
  onClose,
}) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>(
    WizardStep.DESCRIBE_ISSUE
  );
  const [userDescription, setUserDescription] = useState<string>("");
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [generatedTitle, setGeneratedTitle] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [reportLocation, setReportLocation] = useState<
    ReportData["location"] | null
  >(null);
  const [reportImages, setReportImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      console.log("👤 Auth state changed:", user?.email);
    });

    return () => unsubscribe(); // Cleanup on unmount
  }, []);

  // animated success icon values
  const iconScale = useRef(new Animated.Value(0.9)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (currentStep === WizardStep.SUBMISSION_SUCCESS) {
      Animated.parallel([
        Animated.timing(iconScale, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(iconOpacity, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      iconScale.setValue(0.9);
      iconOpacity.setValue(0);
    }
  }, [currentStep, iconOpacity, iconScale]);

  const handleAnalyzeWithAI = async (): Promise<void> => {
    if (!userDescription.trim()) {
      Alert.alert("Error", "Please describe the issue first.");
      return;
    }

    setIsAnalyzing(true);

    try {
      const analysis = await analyzeIssueWithAI(userDescription);

      // Generate title immediately after analysis
      const title = await generateReportTitle(analysis.summary);
      setGeneratedTitle(title);

      // Store title in aiAnalysis
      const analysisWithTitle = { ...analysis, title };
      setAiAnalysis(analysisWithTitle);

      setCurrentStep(WizardStep.ADD_LOCATION); // Automatically move to Step 2 (Location)
    } catch (error) {
      Alert.alert(
        "Analysis Failed",
        error instanceof Error ? error.message : "Unknown error occurred"
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirm = async (
    images: string[] = [],
    submittedAnonymously: boolean = false
  ) => {
    setIsSubmitting(true);

    try {
      const reportData = {
        title: aiAnalysis?.title || userDescription.substring(0, 50) || "Issue Report",
        description: userDescription,
        category: aiAnalysis?.category || "other",
        subcategory: aiAnalysis?.subcategory || "",
        priority: aiAnalysis?.priority || "medium",
        keywords: aiAnalysis?.keywords || [],
        suggested_actions: aiAnalysis?.suggested_actions || [],
        urgency_assessment: getUrgencyAssessment(
          aiAnalysis?.priority || IssuePriority.MEDIUM
        ),
        aiAnalysis: aiAnalysis,
        location: reportLocation
          ? {
              address: reportLocation.address,
              latitude: reportLocation.latitude,
              longitude: reportLocation.longitude,
              barangay: reportLocation.barangay || "",
              city: reportLocation.city || "",
              province: reportLocation.province || "",
              country: "Philippines",
            }
          : null,
        images: images.length > 0 ? images : null,
        submittedAnonymously: submittedAnonymously,
        department: aiAnalysis
          ? getAssignedDepartment(aiAnalysis.category)
          : "General",
        status: "submitted",
      };

      console.log("📤 Submitting report with data:", {
        title: reportData.title,
        location: reportData.location?.address,
        category: reportData.category,
      });

      const reportId = await submitReport(
        reportData,
        currentUser?.uid,
        currentUser?.email
      );

      console.log("✅ Report submitted successfully with ID:", reportId);
      setCurrentStep(WizardStep.SUBMISSION_SUCCESS);
    } catch (error) {
      console.error("❌ Submission failed:", error);
      Alert.alert("Submission Failed", "Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetWizard = (): void => {
    setCurrentStep(WizardStep.DESCRIBE_ISSUE);
    setUserDescription("");
    setAiAnalysis(null);
    onClose(); // Call the onClose prop to close the modal
  };

  const getPriorityColor = (priority: IssuePriority): string => {
    switch (priority) {
      case IssuePriority.HIGH:
        return "#FF3B30";
      case IssuePriority.MEDIUM:
        return "#FF9500";
      case IssuePriority.LOW:
        return "#34C759";
      default:
        return "#8E8E93";
    }
  };

  const getPriorityText = (priority: IssuePriority): string => {
    switch (priority) {
      case IssuePriority.HIGH:
        return "HIGH";
      case IssuePriority.MEDIUM:
        return "MEDIUM";
      case IssuePriority.LOW:
        return "LOW";
      default:
        return "MEDIUM";
    }
  };

  // Add these two functions AFTER getPriorityText
  const getAssignedDepartment = (category: IssueCategory): string => {
    const departmentMap = {
      [IssueCategory.INFRASTRUCTURE]: "DPWH - Roads Division",
      [IssueCategory.UTILITIES]: "Baguio City Utilities",
      [IssueCategory.ENVIRONMENT]: "City Environment Office",
      [IssueCategory.PUBLIC_SAFETY]: "Public Safety Division",
      [IssueCategory.SOCIAL_SERVICES]: "Social Welfare Department",
      [IssueCategory.OTHER]: "General Services Office",
    };
    return departmentMap[category] || "Appropriate Department";
  };

  const getUrgencyAssessment = (priority: IssuePriority): string => {
    switch (priority) {
      case IssuePriority.HIGH:
        return "Requires immediate attention";
      case IssuePriority.MEDIUM:
        return "Should be addressed within days";
      case IssuePriority.LOW:
        return "Can be scheduled for regular maintenance";
      default:
        return "Needs assessment";
    }
  };

  const renderStepContent = (): JSX.Element => {
    switch (currentStep) {
      case WizardStep.DESCRIBE_ISSUE:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Describe Your Issues</Text>
            <Text style={styles.stepDescription}>
              Simply tell us what you&apos;ve observed in your own words. Our AI
              will automatically categorize and structure your report for the
              government.
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                What&apos;s happening in your community?
              </Text>
              <TextInput
                style={styles.textInput}
                multiline
                numberOfLines={6}
                placeholder="May lubak dito sa bakakeng..."
                placeholderTextColor="#8E8E93"
                value={userDescription}
                onChangeText={setUserDescription}
                textAlignVertical="top"
              />
              <Text style={styles.tipText}>
                Tip: Be specific about location, timing, and impact. The more
                details, the better our AI can help!
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.ctaButton,
                !userDescription.trim() && styles.ctaButtonDisabled,
              ]}
              onPress={handleAnalyzeWithAI}
              disabled={!userDescription.trim() || isAnalyzing}
            >
              {isAnalyzing ? (
                <>
                  <ActivityIndicator
                    size="small"
                    color="#fff"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.ctaButtonText}>Analyzing...</Text>
                </>
              ) : (
                <Text style={styles.ctaButtonText}>Next</Text>
              )}
            </TouchableOpacity>
          </View>
        );
      case WizardStep.ADD_LOCATION:
        return (
          <LocationPinner
            onLocationConfirm={(location) => {
              console.log("📍 Location confirmed:", location);
              setReportLocation(location);
              setCurrentStep(WizardStep.REVIEW_SUBMIT);
            }}
            onBack={() => {
              console.log("📍 Going back to describe issue");
              setCurrentStep(WizardStep.DESCRIBE_ISSUE);
            }}
          />
        );

      case WizardStep.REVIEW_SUBMIT:
        return (
          <ReviewSubmitStep
            userDescription={userDescription}
            aiAnalysis={aiAnalysis}
            reportLocation={reportLocation}
            onBack={() => setCurrentStep(WizardStep.ADD_LOCATION)}
            onSubmit={(images) => {
              setReportImages(images);
              handleConfirm(images);
            }}
          />
        );

      case WizardStep.SUBMISSION_SUCCESS:
        return (
          <View style={[styles.stepContainer, styles.successFull]}>
            <View style={styles.successContainer}>
              <Animated.View
                style={{
                  transform: [{ scale: iconScale }],
                  opacity: iconOpacity,
                }}
              >
                <Image
                  source={require("../assets/icons/correct.png")}
                  style={styles.successIconImage}
                  resizeMode="contain"
                />
              </Animated.View>

              <Text style={styles.successTitle}>
                Report Submitted Successfully!
              </Text>
              <Text style={styles.successMessage}>
                Your issue has been categorized and submitted to the appropriate
                government department. You can track the progress in your
                reports section.
              </Text>

              <View style={styles.successButtonWrapper}>
                <TouchableOpacity onPress={onClose} activeOpacity={0.92}>
                  <LinearGradient
                    colors={[theme.Colors.primaryDark, theme.Colors.primary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.ctaButton, styles.successConfirmGradient]}
                  >
                    <Text style={styles.ctaButtonText}>Confirm</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );

      default:
        return <View />;
    }
  };

  // Updated header with close button
  // Update your renderHeader function
  const renderHeader = () => {
    // Don't show header on success step
    if (currentStep === WizardStep.SUBMISSION_SUCCESS) {
      return null;
    }

    return (
      <LinearGradient
        colors={[theme.Colors.primaryDark, theme.Colors.primaryLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <Text style={styles.title}>Submit a Report</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>Step {currentStep} of 3</Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${(currentStep / 3) * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.progressPercentage}>
            {Math.round((currentStep / 3) * 100)}% Complete
          </Text>
        </View>
      </LinearGradient>
    );
  };

  return (
    <View style={styles.container}>
      {renderHeader()}

      <ScrollView style={styles.content}>{renderStepContent()}</ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    padding: 20,
    paddingTop: 28,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.Colors.background,
    flex: 1,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.16)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  closeButtonText: {
    fontSize: 20,
    color: theme.Colors.background,
    fontWeight: "bold",
    lineHeight: 20,
  },
  progressContainer: {
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: theme.Colors.primary,
  },
  progressPercentage: {
    fontSize: 12,
    color: "rgba(255,255,255,0.85)",
    marginTop: 8,
    textAlign: "right",
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    padding: 20,
  },
  successFull: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#1C1C1E",
  },
  stepDescription: {
    fontSize: 16,
    color: "#8E8E93",
    marginBottom: 24,
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#1C1C1E",
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#C6C6C8",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
    minHeight: 120,
  },
  tipText: {
    fontSize: 14,
    color: "#8E8E93",
    fontStyle: "italic",
  },
  ctaButton: {
    backgroundColor: theme.Colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  ctaButtonDisabled: {
    backgroundColor: "#C6C6C8",
  },
  ctaButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
  analysisRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  analysisLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1C1E",
  },
  analysisValue: {
    fontSize: 16,
    color: theme.Colors.primary,
    fontWeight: "500",
  },
  priorityText: {
    fontSize: 16,
    fontWeight: "600",
  },
  summarySection: {
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 14,
    color: "#1C1C1E",
    lineHeight: 20,
    marginTop: 4,
  },
  actionsSection: {
    marginBottom: 8,
  },
  actionItem: {
    fontSize: 14,
    color: "#1C1C1E",
    lineHeight: 20,
    marginLeft: 8,
    marginTop: 2,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: theme.Colors.primary,
  },
  secondaryButton: {
    backgroundColor: "#E5E5EA",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
  secondaryButtonText: {
    color: "#1C1C1E",
    fontSize: 17,
    fontWeight: "600",
  },
  successContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  successIconImage: {
    width: 96,
    height: 96,
    marginBottom: 16,
  },
  successButtonWrapper: {
    width: "100%",
    marginTop: 8,
    paddingHorizontal: 8,
  },
  successConfirmGradient: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  successIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#1C1C1E",
    textAlign: "center",
  },
  successMessage: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    margin: 20,
    minWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#1C1C1E",
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
    color: "#1C1C1E",
    textAlign: "center",
  },
  loadingSubtext: {
    fontSize: 14,
    marginTop: 8,
    color: "#8E8E93",
    textAlign: "center",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#E5E5EA",
  },
  confirmButton: {
    backgroundColor: theme.Colors.primary,
  },
  cancelButtonText: {
    color: "#1C1C1E",
    fontSize: 16,
    fontWeight: "600",
  },
  successButtonContainer: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    marginTop: 16,
  },
  successButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  backToHomeButton: {
    backgroundColor: "#E5E5EA",
  },
  reportAnotherButton: {
    backgroundColor: "#007AFF",
  },
  successButtonText: {
    color: "#1C1C1E",
    fontWeight: "600",
    fontSize: 16,
  },
  reportAnotherButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  confirmButtonText: {
    color: theme.Colors.background,
    fontSize: 16,
    fontWeight: "600",
  },
  analysisContainer: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  confidenceBadge: {
    backgroundColor: "#E8F5E8",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginBottom: 20,
  },
  confidenceText: {
    color: "#2E7D32",
    fontSize: 14,
    fontWeight: "600",
  },
  analysisGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 12,
  },
  analysisCard: {
    flex: 1,
    backgroundColor: "white",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  analysisCardLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  analysisCardValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2c3e50",
  },
  detailCard: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  detailLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2c3e50",
  },
  keywordsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  keywordTag: {
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  keywordText: {
    color: "#1976D2",
    fontSize: 12,
    fontWeight: "500",
  },
  footerNote: {
    backgroundColor: "#E8F4FD",
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  footerNoteText: {
    color: "#1976D2",
    fontSize: 12,
    textAlign: "center",
    fontWeight: "500",
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
});

export default IssueReportingWizard;
