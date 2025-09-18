module.exports = {
  extends: ['expo', '@react-native'],
  plugins: ['react-native'],
  rules: {
    // React Native specific rules
    'react-native/no-raw-text': [
      'error',
      {
        skip: [],
        allowedStrings: [' ', '\n', '•', '✓', '⚠️', '💡', '📏', '⚡', '🌡️', '🔧', '📋', '🚨', '📍', '⏰'],
        textComponents: [
          'Text',
          'RNText',
          'Animated.Text'
        ]
      }
    ],
    'react-native/no-inline-styles': 'warn',
    'react-native/no-unused-styles': 'error',
    
    // Additional React rules for text content
    'react/jsx-no-literals': [
      'error',
      {
        noStrings: true,
        allowedStrings: ['•', '✓', '⚠️', '💡', '📏', '⚡', '🌡️', '🔧', '📋', '🚨', '📍', '⏰'],
        ignoreProps: true
      }
    ],
    
    // Accessibility
    'react-native/no-color-literals': 'warn',
    
    // Performance
    'react-native/split-platform-components': 'warn'
  },
  settings: {
    'react-native': {
      version: 'detect'
    }
  },
  env: {
    'react-native/react-native': true
  }
};