import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import theme from "../config/theme";

interface ImageUploaderProps {
  onImagesConfirm: (images: string[]) => void;
  onBack: () => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImagesConfirm,
  onBack,
}) => {
  const [images, setImages] = useState<string[]>([]);

  const pickImage = async () => {
    try {
      // FIXED: Use launchImageLibraryAsync instead of launchImagePickerAsync
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        allowsMultipleSelection: true, // This might not work on all platforms
      });

      // FIXED: Check the correct property names
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newImages = result.assets.map((asset) => asset.uri);
        setImages((prev) => [...prev, ...newImages].slice(0, 5));
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.Colors.primaryDark, theme.Colors.primaryLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <Text style={[styles.title, styles.titleOnGradient]}>
          Add Photos (Optional)
        </Text>
        <Text style={[styles.subtitle, styles.subtitleOnGradient]}>
          Upload up to 5 photos for better context
        </Text>
      </LinearGradient>

      <ScrollView style={styles.imagesContainer}>
        <View style={styles.imagesGrid}>
          {images.map((uri, index) => (
            <View key={index} style={styles.imageContainer}>
              <Image source={{ uri }} style={styles.image} />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeImage(index)}
              >
                <Text style={styles.removeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
          ))}

          {images.length < 5 && (
            <TouchableOpacity style={styles.addButton} onPress={pickImage}>
              <Text style={styles.addButtonText}>+</Text>
              <Text style={styles.addButtonLabel}>Add Photo</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={onBack}
        >
          <Text style={styles.secondaryButtonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={() => onImagesConfirm(images)}
        >
          {/* FIXED: Changed primaryButtonText to buttonText */}
          <Text style={styles.buttonText}>
            {images.length > 0
              ? `Continue with ${images.length} photos`
              : "Skip Photos"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  headerGradient: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  titleOnGradient: {
    color: theme.Colors.background,
  },
  subtitleOnGradient: {
    color: "rgba(255,255,255,0.92)",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 24,
  },
  imagesContainer: {
    flex: 1,
  },
  imagesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  imageContainer: {
    position: "relative",
    width: 100,
    height: 100,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: theme.Colors.danger,
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
  addButton: {
    width: 100,
    height: 100,
    borderWidth: 2,
    borderColor: theme.Colors.primary,
    borderStyle: "dashed",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.Colors.surface,
  },
  addButtonText: {
    fontSize: 24,
    color: theme.Colors.primary,
    fontWeight: "bold",
  },
  addButtonLabel: {
    marginTop: 4,
    color: theme.Colors.primary,
    fontSize: 12,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
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
  // FIXED: Changed primaryButtonText to buttonText
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
  secondaryButtonText: {
    color: "#1C1C1E",
    fontWeight: "600",
  },
});

export default ImageUploader;
