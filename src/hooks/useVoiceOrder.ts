import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ParsedOrder {
  productSearch: string;
  quantity: number;
  unit: string;
}

interface AutoFillResult {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  confidence: 'high' | 'medium' | 'low';
  searchTerm: string;
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
  autoFillResults: AutoFillResult[];
  startRecording: () => void;
  stopRecording: () => void;
  clearResults: () => void;
  error: string | null;
  isSupported: boolean;
}

// Enhanced fuzzy matching for product names with variants
const fuzzyMatch = (searchTerm: string, target: string): number => {
  const search = searchTerm.toLowerCase().trim();
  const targetLower = target.toLowerCase().trim();
  
  // Exact match
  if (targetLower === search) return 1;
  
  // Remove common separators and normalize
  const normalizeStr = (s: string) => s.replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
  const normalizedSearch = normalizeStr(search);
  const normalizedTarget = normalizeStr(targetLower);
  
  // Check if normalized versions match
  if (normalizedTarget === normalizedSearch) return 1;
  
  // Contains match
  if (normalizedTarget.includes(normalizedSearch)) return 0.9;
  if (normalizedSearch.includes(normalizedTarget)) return 0.85;
  
  // Extract numbers and words separately for better matching
  const extractParts = (s: string) => {
    const numbers = s.match(/\d+/g) || [];
    const words = s.replace(/\d+/g, '').trim().split(/\s+/).filter(w => w.length > 0);
    return { numbers, words };
  };
  
  const searchParts = extractParts(normalizedSearch);
  const targetParts = extractParts(normalizedTarget);
  
  // Check if numbers match
  const numbersMatch = searchParts.numbers.some(sn => 
    targetParts.numbers.some(tn => sn === tn)
  );
  
  // Check if main word matches
  let wordsMatchScore = 0;
  for (const sw of searchParts.words) {
    for (const tw of targetParts.words) {
      if (tw === sw) {
        wordsMatchScore += 1;
      } else if (tw.includes(sw) || sw.includes(tw)) {
        wordsMatchScore += 0.7;
      } else if (tw.startsWith(sw.substring(0, 3)) || sw.startsWith(tw.substring(0, 3))) {
        // First 3 chars match (handles typos like adrak/adarak)
        wordsMatchScore += 0.6;
      }
    }
  }
  
  const maxWords = Math.max(searchParts.words.length, targetParts.words.length, 1);
  const wordScore = wordsMatchScore / maxWords;
  
  // Combine scores
  if (numbersMatch && wordScore > 0) {
    return 0.7 + wordScore * 0.2;
  }
  
  if (wordScore > 0) {
    return 0.4 + wordScore * 0.3;
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
  const [autoFillResults, setAutoFillResults] = useState<AutoFillResult[]>([]);
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

      // Match parsed orders to actual products for auto-fill
      const results: AutoFillResult[] = [];
      
      for (const order of parsedOrders) {
        // Handle both old format (name) and new format (productSearch)
        const searchTerm = (order as any).productSearch || (order as any).name || '';
        const { product, confidence } = findBestMatch(searchTerm, products);
        
        if (product) {
          results.push({
            productId: product.id,
            productName: product.name,
            quantity: order.quantity || 1,
            unit: order.unit || product.unit || 'kg',
            confidence,
            searchTerm
          });
        } else {
          console.log(`No match found for: "${searchTerm}"`);
        }
      }

      setAutoFillResults(results);
      
      // Show toast with summary
      if (results.length > 0) {
        toast({
          title: `Found ${results.length} product${results.length > 1 ? 's' : ''}`,
          description: results.map(r => `${r.productName}: ${r.quantity} ${r.unit}`).join(', '),
        });
      } else {
        setError('Could not match any products. Please try different names.');
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
    setAutoFillResults([]);
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
    setAutoFillResults([]);
    setError(null);
    finalTranscriptRef.current = '';
  }, []);

  return {
    isRecording,
    isProcessing,
    transcript,
    autoFillResults,
    startRecording,
    stopRecording,
    clearResults,
    error,
    isSupported
  };
};
