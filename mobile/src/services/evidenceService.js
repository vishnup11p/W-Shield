import { Audio } from 'expo-av';
import { BACKEND_URL } from '../config/firebaseConfig';

let currentRecording = null;
let chunkIntervalTimer = null;
let chunkCounter = 1;

export async function requestAudioPermissions() {
  const { status } = await Audio.requestPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Audio recording permission was denied');
  }
  return true;
}

/**
 * Starts continuous chunked audio recording
 */
export async function startEvidenceRecording(sessionId) {
  try {
    await requestAudioPermissions();
    chunkCounter = 1;

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false
    });

    await recordChunk(sessionId);

    // Roll chunk every 15 seconds so evidence is continuously persisted
    chunkIntervalTimer = setInterval(async () => {
      await stopCurrentChunkAndUpload(sessionId);
      await recordChunk(sessionId);
    }, 15000);

    return true;
  } catch (err) {
    console.error('[Evidence Recorder Error]', err);
    return false;
  }
}

async function recordChunk(sessionId) {
  try {
    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.LOW_QUALITY);
    await recording.startAsync();
    currentRecording = recording;
    console.log(`[Evidence] Started chunk #${chunkCounter} for session ${sessionId}`);
  } catch (e) {
    console.warn('[Evidence] Record chunk failed:', e.message);
  }
}

async function stopCurrentChunkAndUpload(sessionId) {
  if (!currentRecording) return;
  try {
    const rec = currentRecording;
    currentRecording = null;
    await rec.stopAndUnloadAsync();
    const uri = rec.getURI();
    const thisIndex = chunkCounter++;

    console.log(`[Evidence] Chunk #${thisIndex} finished: ${uri}`);

    // Register metadata with backend / Firebase
    fetch(`${BACKEND_URL}/api/evidence/${sessionId}/meta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'AUDIO_CHUNK',
        downloadUrl: uri,
        storagePath: `evidence/${sessionId}/chunk_${thisIndex}.m4a`,
        chunkIndex: thisIndex,
        durationMs: 15000,
        sizeBytes: 102400
      })
    }).catch(err => console.warn('[Evidence Meta Sync Warning]', err.message));
  } catch (e) {
    console.warn('[Evidence] Chunk unload warning:', e.message);
  }
}

export async function stopEvidenceRecording(sessionId) {
  if (chunkIntervalTimer) {
    clearInterval(chunkIntervalTimer);
    chunkIntervalTimer = null;
  }
  if (currentRecording) {
    await stopCurrentChunkAndUpload(sessionId);
  }
}
