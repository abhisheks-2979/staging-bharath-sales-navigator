import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ParsedOrder {
  productSearch: string;
  quantity: number;
  unit: string;
}

export interface AutoFillResult {
  productId: string;
  productName: string;
  variantId?: string;
  variantName?: string;
  quantity: number;
  unit: string;
  confidence: 'high' | 'medium' | 'low';
  searchTerm: string;
}

export interface VoiceProduct {
  id: string;
  name: string;
  rate: number;
  unit?: string;
  sku?: string;
  category?: { name: string } | string;
  variants?: {
    id: string;
    variant_name: string;
    sku?: string;
    price: number;
    is_active?: boolean;
  }[];
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

// Normalize unit strings for matching
const normalizeUnit = (unit: string): string => {
  const u = (unit || '').toLowerCase().trim();
  // gram variations → g
  if (['gram', 'grams', 'gm', 'grm'].includes(u)) return 'g';
  // kg variations → kg  
  if (['kilogram', 'kilograms', 'kilo', 'kilos'].includes(u)) return 'kg';
  return u;
};

// Normalize search string for better matching
const normalizeSearchString = (s: string): string => {
  return s
    .toLowerCase()
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    // Normalize common unit abbreviations in the string
    .replace(/\b(gram|grams|gm|grm)\b/gi, 'g')
    .replace(/\b(kilogram|kilograms|kilo|kilos)\b/gi, 'kg')
    .trim();
};

// Enhanced fuzzy matching for product names with variants
const fuzzyMatch = (searchTerm: string, target: string): number => {
  const search = normalizeSearchString(searchTerm);
  const targetLower = normalizeSearchString(target);
  
  // Exact match
  if (targetLower === search) return 1;
  
  // Check if normalized versions match
  if (targetLower === search) return 1;
  
  // Contains match
  if (targetLower.includes(search)) return 0.9;
  if (search.includes(targetLower)) return 0.85;
  
  // Extract numbers and words separately for better matching
  const extractParts = (s: string) => {
    const numbers = s.match(/\d+/g) || [];
    const words = s.replace(/\d+/g, '').trim().split(/\s+/).filter(w => w.length > 0);
    return { numbers, words };
  };
  
  const searchParts = extractParts(search);
  const targetParts = extractParts(targetLower);
  
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

interface MatchCandidate {
  product: VoiceProduct;
  variant?: VoiceProduct['variants'][0];
  score: number;
  matchedName: string;
}

const findBestMatch = (searchName: string, products: VoiceProduct[]): { 
  product: VoiceProduct | null; 
  variant?: VoiceProduct['variants'][0];
  confidence: 'high' | 'medium' | 'low';
} => {
  const candidates: MatchCandidate[] = [];
  
  for (const product of products) {
    // Match against base product name
    const baseScore = fuzzyMatch(searchName, product.name);
    if (baseScore > 0) {
      candidates.push({ product, score: baseScore, matchedName: product.name });
    }
    
    // Match against variants if they exist
    if (product.variants && product.variants.length > 0) {
      for (const variant of product.variants) {
        if (variant.is_active === false) continue;
        
        // Match variant name alone
        const variantScore = fuzzyMatch(searchName, variant.variant_name);
        if (variantScore > 0) {
          candidates.push({ product, variant, score: variantScore, matchedName: variant.variant_name });
        }
        
        // Match combined "product + variant" name
        const combinedName = `${product.name} ${variant.variant_name}`;
        const combinedScore = fuzzyMatch(searchName, combinedName);
        if (combinedScore > 0) {
          candidates.push({ product, variant, score: combinedScore, matchedName: combinedName });
        }
      }
    }
  }
  
  // Sort by score descending and get best match
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  
  if (!best) return { product: null, confidence: 'low' };
  
  if (best.score >= 0.8) return { product: best.product, variant: best.variant, confidence: 'high' };
  if (best.score >= 0.5) return { product: best.product, variant: best.variant, confidence: 'medium' };
  if (best.score >= 0.3) return { product: best.product, variant: best.variant, confidence: 'low' };
  
  return { product: null, confidence: 'low' };
};

export const useVoiceOrder = (products: VoiceProduct[]): UseVoiceOrderResult => {
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

    console.log('🎤 Processing transcript:', text);
    console.log('📦 Products available for matching:', products.length);

    try {
      // Check if online
      if (!navigator.onLine) {
        setError('Voice parsing requires internet connection. Please try again when online.');
        setIsProcessing(false);
        return;
      }

      // Check if products are loaded
      if (products.length === 0) {
        setError('Products are still loading. Please wait and try again.');
        setIsProcessing(false);
        return;
      }

      const productNames = products.map(p => p.name);
      console.log('📋 Sending product names to AI:', productNames.slice(0, 10), '...');

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
      console.log('🤖 AI parsed orders:', parsedOrders);
      
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
        console.log(`🔍 Matching "${searchTerm}" against ${products.length} products...`);
        
        const { product, variant, confidence } = findBestMatch(searchTerm, products);
        
        if (product) {
          const displayName = variant ? variant.variant_name : product.name;
          console.log(`✅ Matched "${searchTerm}" → "${displayName}" (confidence: ${confidence})`);
          
          // Normalize the unit from voice input
          const voiceUnit = normalizeUnit(order.unit || 'kg');
          
          results.push({
            productId: product.id,
            productName: product.name,
            variantId: variant?.id,
            variantName: variant?.variant_name,
            quantity: order.quantity || 1,
            unit: voiceUnit === 'g' ? 'Grams' : 'KG', // Normalize to table-supported units
            confidence,
            searchTerm
          });
        } else {
          console.log(`❌ No match found for: "${searchTerm}"`);
        }
      }

      console.log('📊 Final matched results:', results);
      setAutoFillResults(results);
      
      // Don't show toast here - let the callback handle it to avoid duplicates
      if (results.length === 0) {
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
