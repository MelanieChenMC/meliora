import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';

interface TranscriptionResult {
  id: string;
  text: string;
  confidence: number;
  timestamp: string;
  duration?: number;
}

interface UseRealTimeTranscriptionProps {
  sessionId: string;
  onTranscription: (transcription: TranscriptionResult) => void;
  chunkDuration?: number; // in milliseconds
}

export const useRealTimeTranscription = ({
  sessionId,
  onTranscription,
  chunkDuration = 3000 // 3 seconds
}: UseRealTimeTranscriptionProps) => {
  const { getToken } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const transcribeAudio = useCallback(async (audioBlob: Blob) => {
    if (!audioBlob.size) return;

    // 🔇 Check if audio has sufficient volume before transcribing
    const hasAudio = await checkAudioVolume(audioBlob);
    if (!hasAudio) {
      console.log('🔇 Skipping silent audio chunk to prevent hallucinations');
      return;
    }

    setIsProcessing(true);
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');
      formData.append('sessionId', sessionId);

      console.log('🎤 Sending audio chunk for transcription...');
      console.log('📊 Audio blob details:', {
        size: audioBlob.size,
        type: audioBlob.type
      });
      
      // 🔍 DEBUG: Create a URL for the audio blob so you can listen to it
      const audioUrl = URL.createObjectURL(audioBlob);
      console.log('🎧 DEBUG: Listen to the audio being sent:', audioUrl);
      console.log('🎧 To test: Copy the URL above and paste in new tab, or run this in console:');
      console.log(`🎧 new Audio("${audioUrl}").play()`);
      
      // Clean up the URL after 30 seconds to prevent memory leaks
      setTimeout(() => URL.revokeObjectURL(audioUrl), 30000);
      
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${backendUrl}/api/transcribe`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.text && result.text.trim()) {
        const transcription: TranscriptionResult = {
          id: `transcription-${Date.now()}`,
          text: result.text,
          confidence: result.confidence || 0.9,
          timestamp: result.timestamp || new Date().toISOString(),
          duration: result.duration
        };

        console.log('✅ Transcription received:', transcription.text);
        if (result.debug) {
          console.log('🔍 Debug info:', result.debug);
        }

        // 💾 Save transcription to database
        try {
          // Get audio URL from the transcription result debug info
          const audioUrl = result.debug?.audioUrl || null;
          
          const saveResponse = await fetch(`${backendUrl}/api/sessions/${sessionId}/transcriptions`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text: transcription.text,
              confidence: transcription.confidence,
              timestamp: transcription.timestamp,
              speaker: 'user',
              duration: transcription.duration,
              chunkIndex: Math.floor(Date.now() / 1000), // Unix timestamp in seconds
              audioUrl: audioUrl
            }),
          });

          if (saveResponse.ok) {
            console.log('💾 Transcription saved to database');
          } else {
            console.warn('⚠️ Failed to save transcription to database:', await saveResponse.text());
          }
        } catch (saveError) {
          console.warn('⚠️ Error saving transcription to database:', saveError);
        }

        onTranscription(transcription);
      }
    } catch (err) {
      console.error('Error transcribing audio:', err);
      setError(err instanceof Error ? err.message : 'Failed to transcribe audio');
    } finally {
      setIsProcessing(false);
    }
  }, [sessionId, getToken, onTranscription]);

  // 🔊 Function to check if audio has sufficient volume
  const checkAudioVolume = useCallback(async (audioBlob: Blob): Promise<boolean> => {
    return new Promise((resolve) => {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const fileReader = new FileReader();
        
        fileReader.onload = async (e) => {
          try {
            const arrayBuffer = e.target?.result as ArrayBuffer;
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            
            // Analyze the audio data
            const channelData = audioBuffer.getChannelData(0);
            let sum = 0;
            let maxAmplitude = 0;
            let samplesAboveThreshold = 0;
            const threshold = 0.005; // Lower threshold for more sensitivity
            
            for (let i = 0; i < channelData.length; i++) {
              const amplitude = Math.abs(channelData[i]);
              sum += amplitude;
              maxAmplitude = Math.max(maxAmplitude, amplitude);
              
              if (amplitude > threshold) {
                samplesAboveThreshold++;
              }
            }
            
            const averageAmplitude = sum / channelData.length;
            const percentageAboveThreshold = (samplesAboveThreshold / channelData.length) * 100;
            
            // More sophisticated detection
            const hasSignificantAudio = (
              maxAmplitude > 0.01 ||                    // Peak volume check
              averageAmplitude > 0.001 ||               // Average volume check  
              percentageAboveThreshold > 1              // At least 1% of samples have some volume
            );
            
            console.log('🔊 Audio analysis:', {
              duration: audioBuffer.duration.toFixed(2) + 's',
              maxAmplitude: maxAmplitude.toFixed(4),
              averageAmplitude: averageAmplitude.toFixed(6),
              percentageAboveThreshold: percentageAboveThreshold.toFixed(2) + '%',
              hasSignificantAudio,
              decision: hasSignificantAudio ? '✅ SEND' : '🔇 SKIP'
            });
            
            await audioContext.close();
            resolve(hasSignificantAudio);
          } catch (error) {
            console.warn('⚠️ Could not analyze audio volume, sending anyway:', error);
            await audioContext.close();
            resolve(true); // If we can't analyze, send it anyway
          }
        };
        
        fileReader.onerror = () => {
          console.warn('⚠️ Could not read audio file, sending anyway');
          resolve(true); // If we can't read, send it anyway
        };
        
        fileReader.readAsArrayBuffer(audioBlob);
      } catch (error) {
        console.warn('⚠️ Audio analysis not supported, sending anyway:', error);
        resolve(true); // If analysis fails, send it anyway
      }
    });
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      console.log('🎙️ Starting real-time transcription...');
      
      // List available audio devices first
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      console.log('🎤 Available audio inputs:', audioInputs.map(d => ({
        deviceId: d.deviceId,
        label: d.label,
        groupId: d.groupId
      })));
      
      // Get the default microphone specifically
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
          // Advanced noise reduction settings
          channelCount: 1, // Mono for better processing
          // Try to get the default microphone device
          deviceId: 'default'
        } 
      });
      
      // 🔊 Add noise gate processing
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      
      // Simple noise gate
      const noiseGateThreshold = 0.01; // Adjust this value (0.005 - 0.02)
      let isGateOpen = false;
      
      processor.onaudioprocess = (event) => {
        const inputBuffer = event.inputBuffer;
        const outputBuffer = event.outputBuffer;
        const inputData = inputBuffer.getChannelData(0);
        const outputData = outputBuffer.getChannelData(0);
        
        // Calculate RMS (Root Mean Square) for volume detection
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        
        // Noise gate logic
        if (rms > noiseGateThreshold) {
          isGateOpen = true;
        } else if (rms < noiseGateThreshold * 0.5) { // Hysteresis
          isGateOpen = false;
        }
        
        // Apply gate
        for (let i = 0; i < inputData.length; i++) {
          outputData[i] = isGateOpen ? inputData[i] : 0;
        }
      };
      
      // Connect the audio processing chain (NO speakers connection!)
      source.connect(processor);
      
      // Create a new stream from the processed audio
      const destination = audioContext.createMediaStreamDestination();
      processor.connect(destination);
      const processedStream = destination.stream;
      
      // Use the processed stream instead of the original
      streamRef.current = processedStream;

      // Log the processed audio track info
      const audioTracks = processedStream.getAudioTracks();
      console.log('🎵 Processed audio tracks:', audioTracks.map(track => ({
        label: track.label,
        kind: track.kind,
        enabled: track.enabled,
        muted: track.muted,
        settings: track.getSettings()
      })));
      console.log('🔊 Noise gate enabled with threshold:', noiseGateThreshold);

      const mediaRecorder = new MediaRecorder(processedStream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        if (chunksRef.current.length > 0) {
          const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
          transcribeAudio(audioBlob);
          chunksRef.current = [];
        }
      };

      // Record in chunks for real-time processing
      mediaRecorder.start();
      setIsRecording(true);

      // Process chunks at regular intervals
      intervalRef.current = setInterval(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
          mediaRecorder.start(); // Start recording again for next chunk
        }
      }, chunkDuration);

      // Store audio context for cleanup
      (streamRef.current as any).audioContext = audioContext;
      (streamRef.current as any).processor = processor;

    } catch (err) {
      console.error('Error starting recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to start recording');
    }
  }, [chunkDuration, transcribeAudio]);

  const stopRecording = useCallback(() => {
    console.log('⏹️ Stopping real-time transcription...');

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      // Clean up audio processing if it exists
      const stream = streamRef.current as any;
      if (stream.audioContext) {
        try {
          stream.processor.disconnect();
          stream.audioContext.close();
          console.log('🔊 Audio processing cleaned up');
        } catch (error) {
          console.warn('⚠️ Error cleaning up audio processing:', error);
        }
      }
      
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setIsRecording(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, [stopRecording]);

  return {
    startRecording,
    stopRecording,
    isRecording,
    isProcessing,
    error
  };
}; 