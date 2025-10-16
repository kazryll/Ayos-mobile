// components/IssueReportingWizard.tsx
import React, { JSX, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { analyzeIssueWithAI } from "../services/groqServices";
import {
  IssueCategory,
  AIAnalysis,
  IssuePriority,
  ReportData,
  WizardStep,
} from "../types/reporting";


// Add this prop interface
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
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [showAIModal, setShowAIModal] = useState<boolean>(false);

  const handleAnalyzeWithAI = async (): Promise<void> => {
  if (!userDescription.trim()) {
    Alert.alert('Error', 'Please describe the issue first.');
    return;
  }

  setIsAnalyzing(true);
  setShowAIModal(true);

  try {
    console.log('📝 Sending description:', userDescription); // ← ADD THIS
    const analysis = await analyzeIssueWithAI(userDescription);
    setAiAnalysis(analysis);
    setCurrentStep(WizardStep.REVIEW_ANALYSIS);
    setShowAIModal(false); // ← ADD THIS to close modal after success
  } catch (error) {
    Alert.alert('Analysis Failed', error instanceof Error ? error.message : 'Unknown error occurred');
  } finally {
    setIsAnalyzing(false);
  }
};

  const handleConfirm = (): void => {
    const reportData: ReportData = {
      description: userDescription,
      aiAnalysis: aiAnalysis,
      timestamp: new Date().toISOString(),
    };

    console.log("Submitting report:", reportData);
    setCurrentStep(WizardStep.SUBMISSION_SUCCESS);
  };

  const handleCancel = (): void => {
    setShowAIModal(false);
    setIsAnalyzing(false);
  };

  const resetWizard = (): void => {
    setCurrentStep(WizardStep.DESCRIBE_ISSUE);
    setUserDescription("");
    setAiAnalysis(null);
    setShowAIModal(false);
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
    [IssueCategory.INFRASTRUCTURE]: 'DPWH - Roads Division',
    [IssueCategory.UTILITIES]: 'Baguio City Utilities',
    [IssueCategory.ENVIRONMENT]: 'City Environment Office',
    [IssueCategory.PUBLIC_SAFETY]: 'Public Safety Division',
    [IssueCategory.SOCIAL_SERVICES]: 'Social Welfare Department',
    [IssueCategory.OTHER]: 'General Services Office'
  };
  return departmentMap[category] || 'Appropriate Department';
};

const getUrgencyAssessment = (priority: IssuePriority): string => {
  switch (priority) {
    case IssuePriority.HIGH: return 'Requires immediate attention';
    case IssuePriority.MEDIUM: return 'Should be addressed within days';
    case IssuePriority.LOW: return 'Can be scheduled for regular maintenance';
    default: return 'Needs assessment';
  }
};

  const renderStepContent = (): JSX.Element => {
    switch (currentStep) {
      case WizardStep.DESCRIBE_ISSUE:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Describe Your Issues</Text>
            <Text style={styles.stepDescription}>
              Simply tell us what you've observed in your own words. Our AI will
              automatically categorize and structure your report for the
              government.
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                What's happening in your community?
              </Text>
              <TextInput
                style={styles.textInput}
                multiline
                numberOfLines={6}
                placeholder="May lubak dito sa bakanteng..."
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
              onPress={() => setShowAIModal(true)}
              disabled={!userDescription.trim()}
            >
              <Text style={styles.ctaButtonText}>Analyze with AI</Text>
            </TouchableOpacity>
          </View>
        );

      case WizardStep.REVIEW_ANALYSIS:
        
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>AI Analysis Complete</Text>
      
      {aiAnalysis && (
        <View style={styles.analysisContainer}>
          {/* Confidence Badge */}
          <View style={styles.confidenceBadge}>
            <Text style={styles.confidenceText}>85% confident</Text>
          </View>

          {/* Analysis Cards */}
          <View style={styles.analysisGrid}>
            <View style={styles.analysisCard}>
              <Text style={styles.analysisCardLabel}>Category</Text>
              <Text style={styles.analysisCardValue}>{aiAnalysis.category}</Text>
            </View>
            
            <View style={styles.analysisCard}>
              <Text style={styles.analysisCardLabel}>Priority</Text>
              <Text style={[
                styles.analysisCardValue,
                { color: getPriorityColor(aiAnalysis.priority) }
              ]}>
                {getPriorityText(aiAnalysis.priority)}
              </Text>
            </View>
          </View>

          {/* Generated Title - FROM AI */}
          <View style={styles.detailCard}>
            <Text style={styles.detailLabel}>Generated Title</Text>
            <Text style={styles.detailValue}>
              {aiAnalysis.subcategory} {aiAnalysis.location ? `in ${aiAnalysis.location}` : 'Report'}
            </Text>
          </View>

          {/* Assigned Department - DYNAMIC */}
          <View style={styles.detailCard}>
            <Text style={styles.detailLabel}>Assigned Department</Text>
            <Text style={styles.detailValue}>
              {getAssignedDepartment(aiAnalysis.category)}
            </Text>
          </View>

          {/* Urgency Assessment - FROM AI */}
          <View style={styles.detailCard}>
            <Text style={styles.detailLabel}>Urgency Assessment</Text>
            <Text style={styles.detailValue}>
              {aiAnalysis.urgency_assessment || getUrgencyAssessment(aiAnalysis.priority)}
            </Text>
          </View>

          {/* Keywords Extracted - FROM AI */}
          <View style={styles.detailCard}>
            <Text style={styles.detailLabel}>Keywords Extracted</Text>
            <View style={styles.keywordsContainer}>
              {aiAnalysis.keywords && aiAnalysis.keywords.length > 0 ? (
                aiAnalysis.keywords.map((keyword, index) => (
                  <View key={index} style={styles.keywordTag}>
                    <Text style={styles.keywordText}>{keyword}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.detailValue}>No keywords extracted</Text>
              )}
            </View>
          </View>

          {/* Footer Note */}
          <View style={styles.footerNote}>
            <Text style={styles.footerNoteText}>
              This structured data will be sent to the LGU
            </Text>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => setCurrentStep(WizardStep.DESCRIBE_ISSUE)}
        >
          <Text style={styles.secondaryButtonText}>View Details</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleConfirm}
        >
          <Text style={styles.primaryButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

      case WizardStep.SUBMISSION_SUCCESS:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.successContainer}>
              <Text style={styles.successIcon}>✅</Text>
              <Text style={styles.successTitle}>
                Report Submitted Successfully!
              </Text>
              <Text style={styles.successMessage}>
                Your issue has been categorized and submitted to the appropriate
                government department. You can track the progress in your
                reports section.
              </Text>

              <TouchableOpacity
                style={styles.successButton}
                onPress={resetWizard}
              >
                <Text style={styles.successButtonText}>
                  Report Another Issue
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      default:
        return <View />;
    }
  };

  // Updated header with close button
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>AI-Powered Reporting</Text>
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
    </View>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}

      <ScrollView style={styles.content}>{renderStepContent()}</ScrollView>

      {/* AI Analysis Modal */}
      <Modal
        visible={showAIModal}
        transparent
        animationType="slide"
        onRequestClose={handleCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Analyze with AI</Text>

            {isAnalyzing ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>
                  AI is analyzing your description...
                </Text>
                <Text style={styles.loadingSubtext}>
                  Categorizing and summarizing your issue
                </Text>
              </View>
            ) : (
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={handleCancel}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.confirmButton]}
                  onPress={handleAnalyzeWithAI}
                >
                  <Text style={styles.confirmButtonText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
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
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
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
    color: "#1C1C1E",
    flex: 1,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#E5E5EA",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  closeButtonText: {
    fontSize: 20,
    color: "#1C1C1E",
    fontWeight: "bold",
    lineHeight: 20,
  },
  progressContainer: {
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    color: "#8E8E93",
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: "#E5E5EA",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#007AFF",
  },
  progressPercentage: {
    fontSize: 12,
    color: "#8E8E93",
    marginTop: 8,
    textAlign: "right",
  },
  content: {
    flex: 1,
  },
  stepContainer: {
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
    backgroundColor: "#007AFF",
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
    color: "#007AFF",
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
    backgroundColor: "#007AFF",
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
  successButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  successButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
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
    backgroundColor: "#007AFF",
  },
  cancelButtonText: {
    color: "#1C1C1E",
    fontSize: 16,
    fontWeight: "600",
  },
  confirmButtonText: {
    color: "#fff",
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
