
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { createBlob, decode, decodeAudioData } from '../utils/audioUtils';

interface VoiceCallOverlayProps {
  onClose: () => void;
  chatName: string;
  chatAvatar: string;
  isVideo?: boolean;
}

// Fixed typo: VoiceCallOverlayOverlayProps -> VoiceCallOverlayProps
const VoiceCallOverlay: React.FC<VoiceCallOverlayProps> = ({ onClose, chatName, chatAvatar, isVideo = false }) => {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const streamRef = useRef<MediaStream | null>(null);
  const videoIntervalRef = useRef<number | null>(null);

  const stopCall = useCallback(() => {
    if (sessionRef.current) {
        // GUIDELINE: When the conversation is finished, use session.close() to close the connection and release resources.
        try {
          sessionRef.current.close();
        } catch (e) {
          console.error("Error closing session", e);
        }
        sessionRef.current = null;
    }
    if (videoIntervalRef.current) {
      clearInterval(videoIntervalRef.current);
      videoIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    sourcesRef.current.forEach(s => {
      try {
        s.stop();
      } catch (e) {
        // Source might have already stopped or finished
      }
    });
    sourcesRef.current.clear();
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    onClose();
  }, [onClose]);

  useEffect(() => {
    const initCall = async () => {
      try {
        // GUIDELINE: Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        audioContextRef.current = outputCtx;

        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: true,
            video: isVideo 
        });
        streamRef.current = stream;

        if (isVideo && videoRef.current) {
            videoRef.current.srcObject = stream;
        }

        const sessionPromise = ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-12-2025',
          config: {
            responseModalities: [Modality.AUDIO],
            systemInstruction: `You are a helpful hostel management assistant. You are on a call with ${chatName}. Help them with hostel rules, food queries, or general student life. Keep it friendly and informal.`,
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } }
            }
          },
          callbacks: {
            onopen: () => {
              setStatus('connected');
              const source = inputCtx.createMediaStreamSource(stream);
              const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
              scriptProcessor.onaudioprocess = (e) => {
                if (isMuted) return;
                const inputData = e.inputBuffer.getChannelData(0);
                const pcmBlob = createBlob(inputData);
                // GUIDELINE: Solely rely on sessionPromise resolves and then call session.sendRealtimeInput
                sessionPromise.then((session) => {
                  session.sendRealtimeInput({ media: pcmBlob });
                });
              };
              source.connect(scriptProcessor);
              scriptProcessor.connect(inputCtx.destination);

              // If video, start streaming frames
              if (isVideo) {
                  videoIntervalRef.current = window.setInterval(() => {
                      if (!canvasRef.current || !videoRef.current) return;
                      const ctx = canvasRef.current.getContext('2d');
                      if (ctx) {
                          canvasRef.current.width = videoRef.current.videoWidth;
                          canvasRef.current.height = videoRef.current.videoHeight;
                          ctx.drawImage(videoRef.current, 0, 0);
                          canvasRef.current.toBlob(async (blob) => {
                              if (blob) {
                                  const reader = new FileReader();
                                  reader.readAsDataURL(blob);
                                  reader.onloadend = () => {
                                      const base64 = (reader.result as string).split(',')[1];
                                      // GUIDELINE: Use sessionPromise.then to ensure data is streamed only after the session promise resolves.
                                      sessionPromise.then(s => s.sendRealtimeInput({
                                          media: { data: base64, mimeType: 'image/jpeg' }
                                      }));
                                  };
                              }
                          }, 'image/jpeg', 0.5);
                      }
                  }, 1000);
              }
            },
            onmessage: async (message: LiveServerMessage) => {
              const base64 = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
              if (base64) {
                // GUIDELINE: Use a running timestamp variable (e.g., nextStartTime) to track this end time.
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                const audioBuffer = await decodeAudioData(decode(base64), outputCtx, 24000, 1);
                const source = outputCtx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputCtx.destination);
                source.addEventListener('ended', () => sourcesRef.current.delete(source));
                
                // GUIDELINE: Scheduling each new audio chunk to start at this time ensures smooth, gapless playback.
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                sourcesRef.current.add(source);
              }

              if (message.serverContent?.interrupted) {
                sourcesRef.current.forEach(s => {
                  try {
                    s.stop();
                  } catch (e) {}
                });
                sourcesRef.current.clear();
                nextStartTimeRef.current = 0;
              }
            },
            onerror: (e) => {
              console.error(e);
              setStatus('error');
            },
            onclose: () => setStatus('connecting')
          }
        });

        sessionRef.current = await sessionPromise;
      } catch (err) {
        console.error(err);
        setStatus('error');
      }
    };

    initCall();
    return () => {
        // GUIDELINE: Use the cleanup function to ensure resources are released.
        stopCall();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatName, isVideo, stopCall]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900 bg-opacity-95 text-white">
      <div className="relative w-full max-w-lg p-8 flex flex-col items-center">
        {isVideo && (
           <div className="absolute inset-0 z-[-1] overflow-hidden opacity-30">
                <video ref={videoRef} autoPlay muted className="w-full h-full object-cover blur-xl" />
                <canvas ref={canvasRef} className="hidden" />
           </div>
        )}

        <div className="mb-8 relative">
           {isVideo ? (
               <div className="w-64 h-80 bg-slate-800 rounded-3xl border-4 border-slate-700 overflow-hidden shadow-2xl">
                    <video ref={videoRef} autoPlay muted className="w-full h-full object-cover" />
               </div>
           ) : (
                <div className="w-40 h-40 rounded-full border-4 border-blue-500 p-1 shadow-lg shadow-blue-500/20">
                    <img src={chatAvatar} alt={chatName} className="w-full h-full rounded-full object-cover" />
                </div>
           )}
           <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${status === 'connected' ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`}>
             {status}
           </div>
        </div>

        <h2 className="text-3xl font-bold mb-2">{chatName}</h2>
        <p className="text-slate-400 mb-12">
            {isVideo ? 'Hostel Video Call In Progress...' : 'Hostel Voice Call In Progress...'}
        </p>

        <div className="flex items-center space-x-8">
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className={`p-5 rounded-full transition-all ${isMuted ? 'bg-red-500' : 'bg-slate-700 hover:bg-slate-600'}`}
          >
            {isMuted ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            )}
          </button>

          <button 
            onClick={stopCall}
            className="p-6 bg-red-600 hover:bg-red-700 rounded-full shadow-xl shadow-red-900/30 transition-transform active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 rotate-[135deg]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </button>

          <button className="p-5 rounded-full bg-slate-700 hover:bg-slate-600 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceCallOverlay;
