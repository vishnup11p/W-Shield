// Safe mock module for expo-av to prevent ExponentAV crashes on Expo Go
export const Audio = {
  Recording: class MockRecording {
    async prepareToRecordAsync() { return {}; }
    async startAsync() { return {}; }
    async stopAndUnloadAsync() { return {}; }
    getURI() { return null; }
    setProgressUpdateInterval() {}
    setOnRecordingStatusUpdate() {}
  },
  Sound: class MockSound {
    async loadAsync() { return {}; }
    async playAsync() { return {}; }
    async stopAsync() { return {}; }
    async unloadAsync() { return {}; }
  },
  AndroidOutputFormat: { MPEG_4: 2 },
  AndroidAudioEncoder: { AAC: 3 },
  IOSAudioQuality: { LOW: 0x00, MIN: 0x00, MEDIUM: 0x20, HIGH: 0x40, MAX: 0x7f },
  requestPermissionsAsync: async () => ({ status: 'granted', granted: true }),
  getPermissionsAsync: async () => ({ status: 'granted', granted: true }),
  setAudioModeAsync: async () => ({}),
  setIsEnabledAsync: async () => ({})
};

export default { Audio };
