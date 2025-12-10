import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import theme from "../config/theme";

interface ReviewSubmitStepProps {
  userDescription: string;
  reportLocation: any;
  onBack: () => void;
  onSubmit: (images: string[]) => void;
}

const ReviewSubmitStep: React.FC<ReviewSubmitStepProps> = ({
  userDescription,
  reportLocation,
  onBack,
  onSubmit,
}) => {
  const [submitAnonymously, setSubmitAnonymously] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState<string[]>([]);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        allowsMultipleSelection: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newImages = result.assets.map((asset) => asset.uri);
        setImages((prev) => [...prev, ...newImages].slice(0, 5)); // Max 5 images
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      onSubmit(images); // Pass images to parent
    } catch (error) {
      Alert.alert("Submission Failed", "Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "high":
        return "#FF3B30";
      case "medium":
        return "#FF9500";
      case "low":
        return "#34C759";
      default:
        return "#8E8E93";
    }
  };

  // Determine assignedTo based on detected barangay
  const assignedTo = (() => {
    console.log("📍 ReviewSubmitStep - reportLocation:", reportLocation);
    console.log("📍 ReviewSubmitStep - barangay:", reportLocation?.barangay);

    if (reportLocation?.barangay && reportLocation.barangay !== "Unknown") {
      return `${reportLocation.barangay} Barangay LGU`;
    }
    return "To be assigned";
  })();

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.container}>
      <LinearGradient
        colors={[theme.Colors.primaryDark, theme.Colors.primaryLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <Text style={[styles.title, styles.titleOnGradient]}>
          Review & Submit
        </Text>
        <Text style={[styles.subtitle, styles.subtitleOnGradient]}>
          Add photos and review your report before submission
        </Text>
      </LinearGradient>

      {/* Supporting Photos Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Supporting Photos</Text>
        <Text style={styles.sectionDescription}>
          Add photos to support your report
        </Text>

        <View style={styles.imagesSection}>
          {images.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.imagesContainer}
            >
              {images.map((uri, index) => (
                <View key={uri} style={styles.imageWrapper}>
                  <Image source={{ uri }} style={styles.image} />
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeImage(index)}
                  >
                    <Text style={styles.removeButtonText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.noImagesContainer}>
              <Text style={styles.noImagesText}>No photos added</Text>
            </View>
          )}

          {images.length < 5 && (
            <TouchableOpacity style={styles.addButton} onPress={pickImage}>
              <Text style={styles.addButtonIcon}>+</Text>
              <Text style={styles.addButtonText}>Add Photo</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Anonymous Submission */}
      <View style={styles.anonymousSection}>
        <View style={styles.anonymousRow}>
          <View style={styles.anonymousTextContainer}>
            <Text style={styles.anonymousTitle}>Submit anonymously</Text>
            <Text style={styles.anonymousDescription}>
              Your identity will not be shared with government offices
            </Text>
          </View>
          <Switch
            value={submitAnonymously}
            onValueChange={setSubmitAnonymously}
            trackColor={{ false: "#E5E5EA", true: "#007AFF" }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* Report Preview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Report Preview</Text>

        <View style={styles.summaryGrid}>
          {/* Assigned To */}
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Will be assigned to:</Text>
            <Text style={styles.summaryValue}>{assignedTo}</Text>
          </View>

          {/* Location */}
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Location:</Text>
            <Text style={styles.summaryValue}>
              {reportLocation?.address || "234, Bonifacio Street, Baguio City"}
            </Text>
          </View>

          {/* Barangay */}
          {reportLocation?.barangay && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Barangay:</Text>
              <Text style={styles.summaryValue}>{reportLocation.barangay}</Text>
            </View>
          )}
        </View>

        <View style={styles.aiNote}>
          <View style={styles.aiNoteContent}>
            <Image
              source={require("../assets/icons/information.png")}
              style={styles.aiNoteImage}
            />
            <Text style={styles.aiNoteText}>
              AI will analyze and categorize your report upon submission
            </Text>
          </View>
        </View>
      </View>

      {/* Original Description Preview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Original Description</Text>
        <View style={styles.descriptionBox}>
          <Text style={styles.descriptionText}>{userDescription}</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.backButton]}
          onPress={onBack}
          disabled={isSubmitting}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            styles.submitButton,
            isSubmitting && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? "Submitting..." : "Submit Report"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    padding: 20,
  },
  headerGradient: {
    padding: 18,
    borderRadius: 12,
    marginBottom: 16,
  },
  titleOnGradient: {
    color: theme.Colors.background,
  },
  subtitleOnGradient: {
    color: "rgba(255,255,255,0.9)",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#1C1C1E",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 24,
    lineHeight: 22,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    color: "#1C1C1E",
  },
  sectionDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  imagesSection: {
    gap: 12,
  },
  imagesContainer: {
    flexDirection: "row",
  },
  imageWrapper: {
    position: "relative",
    marginRight: 8,
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  removeButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#FF3B30",
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  removeButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  noImagesContainer: {
    height: 80,
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E5EA",
    borderStyle: "dashed",
  },
  noImagesText: {
    color: "#8E8E93",
    fontSize: 14,
  },
  addButton: {
    height: 60,
    borderWidth: 2,
    borderColor: "#007AFF",
    borderStyle: "dashed",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F0F8FF",
    flexDirection: "row",
    gap: 8,
  },
  addButtonIcon: {
    fontSize: 20,
    color: "#007AFF",
    fontWeight: "bold",
  },
  addButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
  },
  anonymousSection: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  anonymousRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  anonymousTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  anonymousTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1C1E",
    marginBottom: 4,
  },
  anonymousDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 18,
  },
  summaryGrid: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
  },
  summaryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1C1C1E",
    flex: 1,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#007AFF",
    flex: 1,
    textAlign: "right",
  },
  descriptionBox: {
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  descriptionText: {
    fontSize: 14,
    color: "#1C1C1E",
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  backButton: {
    backgroundColor: "#E5E5EA",
  },
  backButtonText: {
    color: "#1C1C1E",
    fontWeight: "600",
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: theme.Colors.primary,
  },
  submitButtonDisabled: {
    backgroundColor: "#C7C7CC",
  },
  submitButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  aiNote: {
    backgroundColor: "#E8F4FD",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  aiNoteContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  aiNoteImage: {
    width: 36,
    height: 36,
    marginRight: 12,
    resizeMode: "contain",
  },
  aiNoteText: {
    color: "#1976D2",
    fontSize: 13,
    textAlign: "left",
    fontWeight: "500",
    flex: 1,
  },
});

export default ReviewSubmitStep;
