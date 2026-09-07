import { Audio } from './expoAvMock';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage, BACKEND_URL } from '../config/firebaseConfig';
import { Platform } from 'react-native';

let currentRecording = null;
let chunkIntervalTimer = null;
let chunkCounter = 1;
let isRecordingActive = false;

export async function requestAudioPermissions() {
  if (!Audio || typeof Audio.requestPermissionsAsync !== 'function') {
    console.warn('[Evidence] Audio permissions skipped: Audio native module not loaded');
    return false;
  }
  const { status } = await Audio.requestPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Audio recording permission was denied');
  }
  return true;
}

/**
 * Starts resilient, continuous chunked audio recording with automatic binary upload to Firebase Storage
 */
export async function startEvidenceRecording(sessionId) {
  if (isRecordingActive) return;
  if (!Audio || typeof Audio.setAudioModeAsync !== 'function') {
    console.warn('[Evidence] Audio recording skipped: Native Audio module not available in this client.');
    return false;
  }
  
  try {
    await requestAudioPermissions();
    isRecordingActive = true;
    chunkCounter = 1;

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false
    });

    await recordChunk(sessionId);

    // Roll audio chunk every 12 seconds
    chunkIntervalTimer = setInterval(async () => {
      if (isRecordingActive) {
        await stopCurrentChunkAndUpload(sessionId);
        await recordChunk(sessionId);
      }
    }, 12000);

    return true;
  } catch (err) {
    console.error('[Evidence Recorder Error]', err);
    isRecordingActive = false;
    return false;
  }
}

async function recordChunk(sessionId) {
  try {
    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync({
      android: {
        extension: '.m4a',
        outputFormat: Audio.AndroidOutputFormat.MPEG_4,
        audioEncoder: Audio.AndroidAudioEncoder.AAC,
        sampleRate: 22050,
        numberOfChannels: 1,
        bitRate: 32000,
      },
      ios: {
        extension: '.m4a',
        audioQuality: Audio.IOSAudioQuality.LOW,
        sampleRate: 22050,
        numberOfChannels: 1,
        bitRate: 32000,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
      },
      web: {
        mimeType: 'audio/webm',
        bitsPerSecond: 32000
      }
    });
    
    await recording.startAsync();
    currentRecording = recording;
    console.log(`[Evidence] Recording chunk #${chunkCounter} for session ${sessionId}`);
  } catch (e) {
    console.warn('[Evidence] Record chunk preparation failed:', e.message);
  }
}

async function stopCurrentChunkAndUpload(sessionId) {
  if (!currentRecording) return;
  const rec = currentRecording;
  currentRecording = null;
  const thisIndex = chunkCounter++;

  try {
    await rec.stopAndUnloadAsync();
    const uri = rec.getURI();
    if (!uri) return;

    console.log(`[Evidence] Chunk #${thisIndex} local URI: ${uri}`);
    let downloadUrl = uri;

    // Upload raw binary chunk to Firebase Storage if online
    try {
      if (storage) {
        const response = await fetch(uri);
        const blob = await response.blob();
        const storagePath = `evidence/${sessionId}/audio_chunk_${thisIndex}_${Date.now()}.m4a`;
        const storageRef = ref(storage, storagePath);

        const uploadTask = await uploadBytesResumable(storageRef, blob);
        downloadUrl = await getDownloadURL(uploadTask.ref);
        console.log(`[Evidence] Chunk #${thisIndex} uploaded to Firebase Storage: ${downloadUrl}`);
      }
    } catch (storageErr) {
      console.warn(`[Evidence] Storage upload fallback for chunk #${thisIndex}:`, storageErr.message);
    }

    // Register chunk metadata to backend & RTDB
    await fetch(`${BACKEND_URL}/api/evidence/${sessionId}/meta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'AUDIO_CHUNK',
        downloadUrl,
        storagePath: `evidence/${sessionId}/audio_chunk_${thisIndex}.m4a`,
        chunkIndex: thisIndex,
        durationMs: 12000,
        sizeBytes: 48000
      })
    }).catch(err => console.warn('[Evidence Meta Sync Warning]', err.message));

  } catch (e) {
    console.warn('[Evidence] Chunk unload error:', e.message);
  }
}

export async function stopEvidenceRecording(sessionId) {
  isRecordingActive = false;
  if (chunkIntervalTimer) {
    clearInterval(chunkIntervalTimer);
    chunkIntervalTimer = null;
  }
  if (currentRecording) {
    await stopCurrentChunkAndUpload(sessionId);
  }
}
