import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ParsedOrder {
  name: string;
  quantity: number;
  unit: string;
}

interface MatchedProduct {
  id: string;
  name: string;
  matchedName: string;
  quantity: number;
  unit: string;
  rate: number;
  total: number;
  confidence: 'high' | 'medium' | 'low';
  notFound?: boolean;
}

interface Product {
  id: string;
  name: string;
  rate: number;
  unit?: string;
}

interface UseVoiceOrderResult {
  isRecording: boolean;
  isProcessing: boolean;
  transcript: string;
  matchedProducts: MatchedProduct[];
  startRecording: () => void;
  stopRecording: () => void;
  clearResults: () => void;
  error: string | null;
  isSupported: boolean;
}

// Simple fuzzy matching function
const fuzzyMatch = (searchTerm: string, target: string): number => {
  const search = searchTerm.toLowerCase().trim();
  const targetLower = target.toLowerCase().trim();
  
  // Exact match
  if (targetLower === search) return 1;
  
  // Contains match
  if (targetLower.includes(search) || search.includes(targetLower)) return 0.8;
  
  // Word-based matching
  const searchWords = search.split(/\s+/);
  const targetWords = targetLower.split(/\s+/);
  
  let matchedWords = 0;
  for (const sw of searchWords) {
    for (const tw of targetWords) {
      if (tw.includes(sw) || sw.includes(tw)) {
        matchedWords++;
        break;
      }
    }
  }
  
  if (matchedWords > 0) {
    return 0.5 + (matchedWords / Math.max(searchWords.length, targetWords.length)) * 0.3;
  }
  
  return 0;
};

const findBestMatch = (searchName: string, products: Product[]): { product: Product | null; confidence: 'high' | 'medium' | 'low' } => {
  let bestMatch: Product | null = null;
  let bestScore = 0;
  
  for (const product of products) {
    const score = fuzzyMatch(searchName, product.name);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = product;
    }
  }
  
  if (bestScore >= 0.8) return { product: bestMatch, confidence: 'high' };
  if (bestScore >= 0.5) return { product: bestMatch, confidence: 'medium' };
  if (bestScore >= 0.3) return { product: bestMatch, confidence: 'low' };
  
  return { product: null, confidence: 'low' };
};

export const useVoiceOrder = (products: Product[]): UseVoiceOrderResult => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [matchedProducts, setMatchedProducts] = useState<MatchedProduct[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef('');

  // Check browser support
  const SpeechRecognition = typeof window !== 'undefined' 
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition 
    : null;
  const isSupported = !!SpeechRecognition;

  const processTranscript = useCallback(async (text: string) => {
    if (!text.trim()) {
      setError('No speech detected. Please try again.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Check if online
      if (!navigator.onLine) {
        setError('Voice parsing requires internet connection. Please try again when online.');
        setIsProcessing(false);
        return;
      }

      const productNames = products.map(p => p.name);

      const { data, error: fnError } = await supabase.functions.invoke('voice-order-parser', {
        body: { transcript: text, productNames }
      });

      if (fnError) {
        console.error('Voice parser function error:', fnError);
        setError('Failed to parse voice command. Please try again.');
        setIsProcessing(false);
        return;
      }

      if (data?.error) {
        setError(data.error);
        setIsProcessing(false);
        return;
      }

      const parsedOrders: ParsedOrder[] = data?.orders || [];
      
      if (parsedOrders.length === 0) {
        setError('Could not identify any products. Please speak clearly and try again.');
        setIsProcessing(false);
        return;
      }

      // Match parsed orders to actual products
      const matched: MatchedProduct[] = parsedOrders.map(order => {
        const { product, confidence } = findBestMatch(order.name, products);
        
        if (product) {
          return {
            id: product.id,
            name: product.name,
            matchedName: order.name,
            quantity: order.quantity || 1,
            unit: order.unit || product.unit || 'kg',
            rate: product.rate,
            total: (order.quantity || 1) * product.rate,
            confidence
          };
        } else {
          return {
            id: `not-found-${order.name}`,
            name: order.name,
            matchedName: order.name,
            quantity: order.quantity || 1,
            unit: order.unit || 'kg',
            rate: 0,
            total: 0,
            confidence: 'low' as const,
            notFound: true
          };
        }
      });

      setMatchedProducts(matched);
      
      // Show toast with summary
      const foundCount = matched.filter(m => !m.notFound).length;
      const notFoundCount = matched.filter(m => m.notFound).length;
      
      if (foundCount > 0) {
        toast({
          title: `Found ${foundCount} product${foundCount > 1 ? 's' : ''}`,
          description: notFoundCount > 0 
            ? `${notFoundCount} product${notFoundCount > 1 ? 's' : ''} could not be matched`
            : 'Review and confirm to add to cart',
        });
      }

    } catch (err) {
      console.error('Voice order processing error:', err);
      setError('An error occurred while processing your voice command.');
    } finally {
      setIsProcessing(false);
    }
  }, [products]);

  const startRecording = useCallback(() => {
    if (!isSupported) {
      toast({
        title: 'Not Supported',
        description: 'Voice recognition is not supported in your browser. Try Chrome or Edge.',
        variant: 'destructive'
      });
      return;
    }

    setError(null);
    setTranscript('');
    setMatchedProducts([]);
    finalTranscriptRef.current = '';

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN'; // Indian English for Hindi word support
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsRecording(true);
      console.log('Voice recognition started');
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + ' ';
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      if (finalTranscript) {
        finalTranscriptRef.current += finalTranscript;
      }
      
      setTranscript(finalTranscriptRef.current + interimTranscript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please allow microphone access and try again.');
      } else if (event.error === 'no-speech') {
        setError('No speech detected. Please try again.');
      } else {
        setError(`Voice recognition error: ${event.error}`);
      }
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
      console.log('Voice recognition ended');
      
      // Process the final transcript
      const finalText = finalTranscriptRef.current.trim();
      if (finalText) {
        processTranscript(finalText);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported, SpeechRecognition, processTranscript]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const clearResults = useCallback(() => {
    setTranscript('');
    setMatchedProducts([]);
    setError(null);
    finalTranscriptRef.current = '';
  }, []);

  return {
    isRecording,
    isProcessing,
    transcript,
    matchedProducts,
    startRecording,
    stopRecording,
    clearResults,
    error,
    isSupported
  };
};
