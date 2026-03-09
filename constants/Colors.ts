const tintColorLight = '#2f95dc';
const tintColorDark = '#fff';

export const NOTE_COLORS = {
  light: [
    '#ffffff', // Default
    '#f28b82', // Red
    '#fbbc04', // Orange
    '#fff475', // Yellow
    '#ccff90', // Green
    '#a7ffeb', // Teal
    '#cbf0f8', // Blue
    '#aecbfa', // Dark Blue
    '#d7aefb', // Purple
    '#fdcfe8', // Pink
    '#e6c9a8', // Brown
    '#e8eaed', // Gray
  ],
  dark: [
    '#000000', // Default Black
    '#77172e', // Dark Red
    '#692b17', // Dark Orange
    '#7c5e10', // Dark Yellow
    '#265d48', // Dark Green
    '#256377', // Dark Cyan
    '#1e3a8a', // Dark Blue
    '#472e5b', // Dark Purple
    '#6c394f', // Dark Pink
    '#443126', // Dark Brown
    '#3c3f43', // Dark Gray
  ]
};

export default {
  light: {
    text: '#202124',
    background: '#FFFFFF',
    tint: tintColorLight,
    tabIconDefault: '#5f6368',
    tabIconSelected: tintColorLight,
    card: '#FFFFFF',
    border: '#e0e0e0',
    subtext: '#5f6368',
    drawer: '#FFFFFF',
    inputBackground: '#f1f3f4',
    icon: '#5f6368',
    fab: '#FFFFFF',
    fabIcon: '#202124',
  },
  dark: {
    text: '#e8eaed',
    background: '#000000',
    tint: tintColorDark,
    tabIconDefault: '#9aa0a6',
    tabIconSelected: tintColorDark,
    card: '#1C1C1E',
    border: '#3c4043',
    subtext: '#9aa0a6',
    drawer: '#1C1C1E',
    inputBackground: '#202124',
    icon: '#e8eaed',
    fab: '#1C1C1E',
    fabIcon: '#FFFFFF',
  },
};
