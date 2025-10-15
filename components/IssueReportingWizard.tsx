// components/IssueReportingWizard.tsx
import React, { JSX, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { analyzeIssueWithAI } from '../services/geminiServices';
import { AIAnalysis, ReportData, WizardStep, IssuePriority } from '../types/reporting';

// Add this prop interface
interface IssueReportingWizardProps {
  onClose: () => void;
}

const IssueReportingWizard: React.FC<IssueReportingWizardProps> = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>(WizardStep.DESCRIBE_ISSUE);
  const [userDescription, setUserDescription] = useState<string>('');
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
      const analysis = await analyzeIssueWithAI(userDescription);
      setAiAnalysis(analysis);
      setCurrentStep(WizardStep.REVIEW_ANALYSIS);
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
    
    console.log('Submitting report:', reportData);
    setCurrentStep(WizardStep.SUBMISSION_SUCCESS);
  };

  const handleCancel = (): void => {
    setShowAIModal(false);
    setIsAnalyzing(false);
  };

  const resetWizard = (): void => {
    setCurrentStep(WizardStep.DESCRIBE_ISSUE);
    setUserDescription('');
    setAiAnalysis(null);
    setShowAIModal(false);
    onClose(); // Call the onClose prop to close the modal
  };

  const getPriorityColor = (priority: IssuePriority): string => {
    switch (priority) {
      case IssuePriority.HIGH:
        return '#FF3B30';
      case IssuePriority.MEDIUM:
        return '#FF9500';
      case IssuePriority.LOW:
        return '#34C759';
      default:
        return '#8E8E93';
    }
  };

  const getPriorityText = (priority: IssuePriority): string => {
    switch (priority) {
      case IssuePriority.HIGH:
        return 'HIGH';
      case IssuePriority.MEDIUM:
        return 'MEDIUM';
      case IssuePriority.LOW:
        return 'LOW';
      default:
        return 'MEDIUM';
    }
  };

  const renderStepContent = (): JSX.Element => {
    switch (currentStep) {
      case WizardStep.DESCRIBE_ISSUE:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Describe Your Issues</Text>
            <Text style={styles.stepDescription}>
              Simply tell us what you've observed in your own words. Our AI will automatically categorize and structure your report for the government.
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>What's happening in your community?</Text>
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
                Tip: Be specific about location, timing, and impact. The more details, the better our AI can help!
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.ctaButton,
                !userDescription.trim() && styles.ctaButtonDisabled
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
            <Text style={styles.stepTitle}>AI Analysis Results</Text>
            
            {aiAnalysis && (
              <View style={styles.analysisCard}>
                <View style={styles.analysisRow}>
                  <Text style={styles.analysisLabel}>Category:</Text>
                  <Text style={styles.analysisValue}>{aiAnalysis.category}</Text>
                </View>
                
                <View style={styles.analysisRow}>
                  <Text style={styles.analysisLabel}>Subcategory:</Text>
                  <Text style={styles.analysisValue}>{aiAnalysis.subcategory}</Text>
                </View>
                
                <View style={styles.analysisRow}>
                  <Text style={styles.analysisLabel}>Priority:</Text>
                  <Text style={[
                    styles.priorityText,
                    { color: getPriorityColor(aiAnalysis.priority) }
                  ]}>
                    {getPriorityText(aiAnalysis.priority)}
                  </Text>
                </View>
                
                <View style={styles.summarySection}>
                  <Text style={styles.analysisLabel}>Summary:</Text>
                  <Text style={styles.summaryText}>{aiAnalysis.summary}</Text>
                </View>
                
                <View style={styles.actionsSection}>
                  <Text style={styles.analysisLabel}>Suggested Actions:</Text>
                  {aiAnalysis.suggested_actions.map((action: string, index: number) => (
                    <Text key={index} style={styles.actionItem}>• {action}</Text>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={() => setCurrentStep(WizardStep.DESCRIBE_ISSUE)}
              >
                <Text style={styles.secondaryButtonText}>Back</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={handleConfirm}
              >
                <Text style={styles.primaryButtonText}>Confirm & Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case WizardStep.SUBMISSION_SUCCESS:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.successContainer}>
              <Text style={styles.successIcon}>✅</Text>
              <Text style={styles.successTitle}>Report Submitted Successfully!</Text>
              <Text style={styles.successMessage}>
                Your issue has been categorized and submitted to the appropriate government department. 
                You can track the progress in your reports section.
              </Text>
              
              <TouchableOpacity
                style={styles.successButton}
                onPress={resetWizard}
              >
                <Text style={styles.successButtonText}>Report Another Issue</Text>
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
              { width: `${(currentStep / 3) * 100}%` }
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

      <ScrollView style={styles.content}>
        {renderStepContent()}
      </ScrollView>

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
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C1C1E',
    flex: 1,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E5E5EA',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#1C1C1E',
    fontWeight: 'bold',
    lineHeight: 20,
  },
  progressContainer: {
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  progressPercentage: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 8,
    textAlign: 'right',
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1C1C1E',
  },
  stepDescription: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 24,
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1C1C1E',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#C6C6C8',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
    minHeight: 120,
  },
  tipText: {
    fontSize: 14,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
  ctaButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  ctaButtonDisabled: {
    backgroundColor: '#C6C6C8',
  },
  ctaButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  analysisCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  analysisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  analysisLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  analysisValue: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  priorityText: {
    fontSize: 16,
    fontWeight: '600',
  },
  summarySection: {
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 14,
    color: '#1C1C1E',
    lineHeight: 20,
    marginTop: 4,
  },
  actionsSection: {
    marginBottom: 8,
  },
  actionItem: {
    fontSize: 14,
    color: '#1C1C1E',
    lineHeight: 20,
    marginLeft: 8,
    marginTop: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#E5E5EA',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#1C1C1E',
    fontSize: 17,
    fontWeight: '600',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  successIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1C1C1E',
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  successButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  successButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    minWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#1C1C1E',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
    color: '#1C1C1E',
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 14,
    marginTop: 8,
    color: '#8E8E93',
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#E5E5EA',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
  },
  cancelButtonText: {
    color: '#1C1C1E',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default IssueReportingWizard;