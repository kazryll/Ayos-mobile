// components/ImageIcon.tsx
import React from 'react';
import { Image, View, ImageStyle } from 'react-native';
import theme from '../config/theme';

const iconMap = {
  home: require('../assets/icons/home.png'),
  trophy: require('../assets/icons/trophy.png'),
  warning: require('../assets/icons/warning.png'),
  'chart-bar': require('../assets/icons/chart-bar.png'),
  user: require('../assets/icons/user.png'),
};

type ImageIconProps = {
  name: keyof typeof iconMap;
  size?: number;
  color?: string; // optional tint color
};

const ImageIcon = ({ name, size = 24, color }: ImageIconProps) => {
  const iconSource = iconMap[name];
  const tint = color || theme.Colors.text;
  
  if (!iconSource) {
    console.warn(`Icon "${name}" not found`);
    return null;
  }

  return (
    <View style={{ width: size, height: size }}>
      <Image 
        source={iconSource} 
        style={{ 
          width: size, 
          height: size,
          // Apply tint for single-color PNGs where possible
          tintColor: tint as unknown as ImageStyle['tintColor'],
        }}
        resizeMode="contain"
      />
    </View>
  );
};

export default ImageIcon;