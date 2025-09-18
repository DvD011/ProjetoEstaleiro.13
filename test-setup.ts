import { vi } from 'vitest';

// Mock React Native modules
vi.mock('react-native', () => ({
  Platform: { OS: 'web' },
  StyleSheet: {
    create: (styles: any) => styles,
  },
  Alert: {
    alert: vi.fn(),
  },
  Dimensions: {
    get: () => ({ width: 375, height: 812 }),
  },
}));

// Mock Expo modules
vi.mock('expo-router', () => ({
  router: {
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  },
  useLocalSearchParams: () => ({ id: 'test_inspection' }),
}));

vi.mock('expo-file-system', () => ({
  documentDirectory: '/mock/documents/',
  getInfoAsync: vi.fn(),
  writeAsStringAsync: vi.fn(),
  readAsStringAsync: vi.fn(),
}));

vi.mock('expo-web-browser', () => ({
  openBrowserAsync: vi.fn(),
}));

// Mock AsyncStorage
vi.mock('@react-native-async-storage/async-storage', () => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
}));

// Global test utilities
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};