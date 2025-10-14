// components/ImageIcon.tsx
import React from 'react';
import { Image, View } from 'react-native';

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
};

const ImageIcon = ({ name, size = 24 }: ImageIconProps) => {
  const iconSource = iconMap[name];
  
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
        }}
        resizeMode="contain"
      />
    </View>
  );
};

export default ImageIcon;