// Voice Search Hook
// Provides speech-to-text functionality for voice search

import { useState, useCallback, useEffect } from 'react';
import logger from '@/lib/logger';

interface UseVoiceSearchReturn {
    isListening: boolean;
    transcript: string;
    error: string | null;
    isSupported: boolean;
    startListening: () => void;
    stopListening: () => void;
    resetTranscript: () => void;
}

export const useVoiceSearch = (): UseVoiceSearchReturn => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);

    // Check if speech recognition is supported
    const isSupported = typeof window !== 'undefined' &&
        ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

    useEffect(() => {
        if (!isSupported) return;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognitionInstance = new SpeechRecognition();

        recognitionInstance.continuous = false;
        recognitionInstance.interimResults = true;
        recognitionInstance.lang = 'en-IN'; // Indian English

        recognitionInstance.onresult = (event) => {
            const current = event.resultIndex;
            const transcriptText = event.results[current][0].transcript;
            setTranscript(transcriptText);
            logger.debug(`Voice transcript: ${transcriptText}`, { context: 'VoiceSearch' });
        };

        recognitionInstance.onerror = (event) => {
            logger.error('Voice search error', event.error, { context: 'VoiceSearch' });
            setError(getErrorMessage(event.error));
            setIsListening(false);
        };

        recognitionInstance.onend = () => {
            setIsListening(false);
        };

        setRecognition(recognitionInstance);

        return () => {
            recognitionInstance.abort();
        };
    }, [isSupported]);

    const getErrorMessage = (error: string): string => {
        switch (error) {
            case 'not-allowed':
                return 'Microphone access denied. Please allow microphone access.';
            case 'no-speech':
                return 'No speech detected. Please try again.';
            case 'network':
                return 'Network error. Please check your connection.';
            default:
                return 'Voice search error. Please try again.';
        }
    };

    const startListening = useCallback(() => {
        if (!recognition) return;

        setError(null);
        setTranscript('');

        try {
            recognition.start();
            setIsListening(true);
            logger.info('Voice search started', { context: 'VoiceSearch' });
        } catch (err) {
            logger.error('Failed to start voice search', err, { context: 'VoiceSearch' });
        }
    }, [recognition]);

    const stopListening = useCallback(() => {
        if (!recognition) return;

        recognition.stop();
        setIsListening(false);
        logger.info('Voice search stopped', { context: 'VoiceSearch' });
    }, [recognition]);

    const resetTranscript = useCallback(() => {
        setTranscript('');
        setError(null);
    }, []);

    return {
        isListening,
        transcript,
        error,
        isSupported,
        startListening,
        stopListening,
        resetTranscript,
    };
};

// Extend Window interface for TypeScript
declare global {
    interface Window {
        SpeechRecognition: typeof SpeechRecognition;
        webkitSpeechRecognition: typeof SpeechRecognition;
    }
}

export default useVoiceSearch;
