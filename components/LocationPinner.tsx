import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import * as Location from 'expo-location';

interface LocationPinnerProps {
  onLocationConfirm: (location: { latitude: number; longitude: number; address: string; city?: string; province?: string }) => void;
  onBack: () => void;
}

// FUCKING MOVE THIS OUTSIDE THE COMPONENT SO IT DOESN'T RECREATE
const GOOGLE_MAPS_API_KEY = 'AIzaSyBRV1JEt_qSWZPxpvouEUNzuPbW5gWW4yc';
const mapContainerStyle = {
  width: '100%',
  height: 300,
};

const defaultCenter = {
  lat: 16.4023,
  lng: 120.5960
};

const LocationPinner: React.FC<LocationPinnerProps> = ({ onLocationConfirm, onBack }) => {
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number; address: string; city?: string; province?: string } | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number; address: string; city?: string; province?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapLoading, setMapLoading] = useState(true);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [scriptError, setScriptError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGeocodingAddress, setIsGeocodingAddress] = useState(false);
  
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setError('Location permission is required to pin the issue location. Please enable location permissions in your device settings.');
        setLoading(false);
        return;
      }

      console.log('📍 Getting current location...');
      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      const lat = location.coords.latitude;
      const lng = location.coords.longitude;
      
      console.log('📍 Location found:', lat, lng);
      console.log('📍 Reverse geocoding with Google Maps...');
      
      // Use Google Maps Geocoding API
      const geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`;
      
      const response = await fetch(geocodingUrl);
      const data = await response.json();
      
      console.log('📍 Google Geocoding response:', data);
      
      let address = '';
      let city = '';
      let province = '';
      
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        address = result.formatted_address;
        
        // Parse address components
        for (const component of result.address_components) {
          const types = component.types;
          
          if (types.includes('locality')) {
            city = component.long_name;
          }
          if (types.includes('administrative_area_level_1')) {
            province = component.long_name;
          }
        }
        
        console.log('✅ Extracted:', { address, city, province });
      } else {
        address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      }

      const locationData = {
        latitude: lat,
        longitude: lng,
        address,
        city,
        province,
      };

      console.log('📍 Location data set:', locationData);
      setCurrentLocation(locationData);
      setSelectedLocation(locationData);
      
    } catch (error) {
      console.error('📍 Location error:', error);
      setError('Failed to get your location. Please check your GPS and try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: Location.LocationGeocodedAddress | null): string => {
    if (!address) {
      console.warn('⚠️ No address object provided');
      return '';
    }
    
    console.log('🗺️ Full address object:', JSON.stringify(address, null, 2));
    
    const parts = [];
    if (address.street) parts.push(address.street);
    if (address.district) parts.push(address.district); // Barangay/District
    if (address.city) parts.push(address.city);
    if (address.region) parts.push(address.region);
    if (address.country && address.country !== 'Philippines') parts.push(address.country);
    
    // If no parts found, try alternative fields
    if (parts.length === 0) {
      console.warn('⚠️ No standard address fields found, trying alternatives');
      if (address.name) parts.push(address.name);
      if (address.postalCode) parts.push(address.postalCode);
      if (address.isoCountryCode) parts.push(address.isoCountryCode);
    }
    
    const formattedAddress = parts.join(', ');
    console.log('✅ Formatted address:', formattedAddress);
    
    return formattedAddress;
  };

  const handleMapLoad = () => {
    console.log('🗺️ Google Maps script loaded successfully!');
    setScriptLoaded(true);
    setMapLoading(false);
    setScriptError(false);
  };

  const handleScriptError = () => {
    console.error('❌ Failed to load Google Maps script');
    setScriptError(true);
    setMapLoading(false);
    setScriptLoaded(false);
  };

  const handleMapClick = (event: google.maps.MapMouseEvent) => {
    if (!event.latLng) return;
    
    const lat = event.latLng.lat();
    const lng = event.latLng.lng();
    
    console.log('📍 Map clicked at:', lat, lng);
    
    // Set geocoding flag to prevent premature confirmation
    setIsGeocodingAddress(true);
    
    // Immediately set coordinates while we geocode
    const manualLocation = {
      latitude: lat,
      longitude: lng,
      address: `Getting address...`,
    };

    setSelectedLocation(manualLocation);
    
    // Reverse geocode in background to get address
    reverseGeocode(lat, lng);
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      console.log('📍 Starting reverse geocoding via Google Maps API for:', lat, lng);
      
      // Use Google Maps Geocoding API
      const geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`;
      
      const response = await fetch(geocodingUrl);
      const data = await response.json();
      
      console.log('📍 Google Geocoding response:', data);
      
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        
        // Extract address components
        let address = result.formatted_address;
        let city = '';
        let province = '';
        
        // Parse address components to get city and province
        for (const component of result.address_components) {
          const types = component.types;
          
          if (types.includes('locality')) {
            city = component.long_name;
          }
          if (types.includes('administrative_area_level_1')) {
            province = component.long_name;
          }
        }
        
        console.log('✅ Extracted:', { address, city, province });
        
        // Update selected location with full address info
        setSelectedLocation(prev => prev ? { 
          ...prev, 
          address,
          city,
          province
        } : null);
      } else {
        console.warn('⚠️ No results from Google Geocoding, using coordinates');
        const fallbackAddress = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        setSelectedLocation(prev => prev ? { ...prev, address: fallbackAddress } : prev);
      }
    } catch (error) {
      console.error('❌ Error reverse geocoding with Google Maps:', error);
      const fallbackAddress = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      setSelectedLocation(prev => prev ? { ...prev, address: fallbackAddress } : prev);
    } finally {
      setIsGeocodingAddress(false);
    }
  };

  const handleConfirm = () => {
    if (isGeocodingAddress) {
      Alert.alert('Please wait', 'Getting address details...');
      return;
    }
    
    if (selectedLocation) {
      console.log('✅ Confirming location:', selectedLocation);
      onLocationConfirm(selectedLocation);
    } else {
      Alert.alert('No Location Selected', 'Please select a location on the map or use your current location.');
    }
  };

  const useCurrentLocation = () => {
    if (currentLocation) {
      setSelectedLocation(currentLocation);
    }
  };

  // FALLBACK UI IF GOOGLE MAPS FAILS TO LOAD
  const renderMapFallback = () => {
    return (
      <View style={styles.mapFallback}>
        <Text style={styles.mapFallbackTitle}>🗺️ Map Unavailable</Text>
        <Text style={styles.mapFallbackText}>
          {scriptError 
            ? 'Google Maps failed to load. Please check your API key and internet connection.'
            : 'Loading map...'
          }
        </Text>
        {scriptError && (
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => window.location.reload()}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        )}
        <View style={styles.fallbackLocation}>
          <Text style={styles.fallbackLocationTitle}>Selected Location:</Text>
          {selectedLocation ? (
            <>
              <Text style={styles.fallbackLocationAddress}>{selectedLocation.address}</Text>
              <Text style={styles.fallbackLocationCoords}>
                Lat: {selectedLocation.latitude.toFixed(6)}, Lng: {selectedLocation.longitude.toFixed(6)}
              </Text>
            </>
          ) : (
            <Text style={styles.fallbackLocationText}>No location selected</Text>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
         
        <View style={styles.content}>
          <Text style={styles.title}>Confirm Location</Text>
          <Text style={styles.subtitle}>
            We need the exact location to route this to the correct local office.
          </Text>
          
          <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
          <Text style={styles.loadingText}>Getting your location...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>

      {/* Main Content */}
      <View style={styles.content}>
        <Text style={styles.title}>Confirm Location</Text>
        <Text style={styles.subtitle}>
          We need the exact location to route this to the correct local office.
        </Text>

        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            
            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={[styles.button, styles.backButton]} 
                onPress={onBack}
              >
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.button, styles.primaryButton]} 
                onPress={getCurrentLocation}
              >
                <Text style={styles.primaryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            {/* Google Maps Container */}
            <View style={styles.mapContainer}>
              <Text style={styles.mapTitle}>Tap on the map to select location</Text>
              
              {mapLoading && (
                <View style={styles.mapLoader}>
                  <ActivityIndicator size="large" color="#007AFF" />
                  <Text style={styles.mapLoadingText}>Loading map...</Text>
                </View>
              )}
              
              <LoadScript
                googleMapsApiKey={GOOGLE_MAPS_API_KEY}
                onLoad={handleMapLoad}
                onError={handleScriptError}
                loadingElement={<View style={styles.mapLoader} />}
              >
                {scriptLoaded ? (
                  <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    center={currentLocation ? 
                      { lat: currentLocation.latitude, lng: currentLocation.longitude } : 
                      defaultCenter
                    }
                    zoom={15}
                    onClick={handleMapClick}
                    options={{
                      streetViewControl: false,
                      mapTypeControl: false,
                      fullscreenControl: false,
                      zoomControl: true,
                      gestureHandling: 'greedy'
                    }}
                  >
                    {/* Marker for selected location */}
                    {selectedLocation && (
                      <Marker
                        position={{
                          lat: selectedLocation.latitude,
                          lng: selectedLocation.longitude
                        }}
                      />
                    )}
                  </GoogleMap>
                ) : (
                  renderMapFallback()
                )}
              </LoadScript>
              
              <TouchableOpacity 
                style={styles.useCurrentLocationButton}
                onPress={useCurrentLocation}
              >
                <Text style={styles.useCurrentLocationText}>Use My Current Location</Text>
              </TouchableOpacity>
            </View>

            {/* Selected Location Display */}
            {selectedLocation && (
              <View style={styles.selectedLocationContainer}>
                <Text style={styles.selectedLocationTitle}>Selected Location:</Text>
                <Text style={styles.selectedLocationAddress}>{selectedLocation.address}</Text>
                {(selectedLocation.city || selectedLocation.province) && (
                  <Text style={styles.selectedLocationCity}>
                    {[selectedLocation.city, selectedLocation.province].filter(Boolean).join(', ')}
                  </Text>
                )}
                <Text style={styles.selectedLocationCoords}>
                  Lat: {selectedLocation.latitude.toFixed(6)}, Lng: {selectedLocation.longitude.toFixed(6)}
                </Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={[styles.button, styles.backButton]} 
                onPress={onBack}
                disabled={isGeocodingAddress}
              >
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.button, 
                  styles.continueButton,
                  isGeocodingAddress && styles.buttonDisabled
                ]} 
                onPress={handleConfirm}
                disabled={isGeocodingAddress}
              >
                {isGeocodingAddress ? (
                  <>
                    <ActivityIndicator size="small" color="#ffffff" style={styles.buttonLoader} />
                    <Text style={styles.continueButtonText}>Getting address...</Text>
                  </>
                ) : (
                  <Text style={styles.continueButtonText}>Continue</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  progressContainer: {
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1C1C1E',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    lineHeight: 22,
  },
  mapContainer: {
    marginBottom: 24,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  mapTitle: {
    fontSize: 16,
    fontWeight: '600',
    padding: 16,
    backgroundColor: '#F8F8F8',
    textAlign: 'center',
  },
  mapLoader: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
  },
  mapLoadingText: {
    marginTop: 12,
    color: '#666',
  },
  useCurrentLocationButton: {
    padding: 12,
    backgroundColor: '#F0F8FF',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  useCurrentLocationText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  selectedLocationContainer: {
    backgroundColor: '#F8F8F8',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  selectedLocationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1C1C1E',
  },
  selectedLocationAddress: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
    color: '#1C1C1E',
  },
  selectedLocationCity: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  selectedLocationCoords: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  backButton: {
    backgroundColor: '#E5E5EA',
  },
  backButtonText: {
    color: '#1C1C1E',
    fontWeight: '600',
    fontSize: 16,
  },
  continueButton: {
    backgroundColor: '#007AFF',
  },
  continueButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonLoader: {
    marginRight: 8,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  errorContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  errorText: {
    color: '#FF3B30',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  loader: {
    marginVertical: 20,
  },
  loadingText: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 20,
  },
  mapFallback: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    padding: 20,
  },
  mapFallbackTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1C1C1E',
  },
  mapFallbackText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    padding: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    marginBottom: 16,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  fallbackLocation: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    width: '100%',
  },
  fallbackLocationTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    color: '#1C1C1E',
  },
  fallbackLocationAddress: {
    fontSize: 14,
    color: '#1C1C1E',
    marginBottom: 2,
  },
  fallbackLocationCoords: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  fallbackLocationText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
});

export default LocationPinner;