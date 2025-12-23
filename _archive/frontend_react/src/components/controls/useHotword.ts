import { useEffect } from 'react';

export function useHotword(onWake: () => void) {
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onresult = (e: any) => {
      const text = e.results[e.results.length - 1][0].transcript.toLowerCase();
      if (text.includes('alan')) onWake();
    };

    rec.start();
    return () => rec.stop();
  }, []);
}
