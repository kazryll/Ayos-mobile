// config/theme.ts
// Centralized theme/colors for AYOS
export const Colors = {
  // Primary gradient direction: from deep blue to green
  primaryDark: '#174664',
  primary: '#167048', // main accent
  primaryLight: '#167A43',

  background: '#ffffff',
  surface: '#f6fbfa', // subtle off-white for surfaces like navbar
  muted: '#7f8c8d',
  success: '#167048',
  danger: '#e74c3c',
  accent: '#22c55e',
  divider: '#ecf0f1',
  textTitle: '#16323a',
  text: '#2c3e50',
};

export const Gradients = {
  // Header gradient: blue to green (green emphasized)
  header: [Colors.primaryDark, Colors.primaryLight],
  // Reverse gradient: green to blue
  headerReverse: [Colors.primaryLight, Colors.primaryDark],
};

export const Radii = {
  small: 6,
  medium: 10,
  large: 20,
  round: 999,
};

export const Typography = {
  label: 11,
  small: 12,
  body: 14,
  title: 18,
};

export default {
  Colors,
  Gradients,
  Radii,
  Typography,
};
