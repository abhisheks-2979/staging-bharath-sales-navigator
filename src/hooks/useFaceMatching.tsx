import { useState, useCallback } from 'react';
import { pipeline, env } from '@huggingface/transformers';

// Configure transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

export interface FaceMatchResult {
  status: 'match' | 'partial' | 'nomatch' | 'error';
  confidence: number;
  color: 'green' | 'amber' | 'red';
}

export const useFaceMatching = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [pipeline, setPipeline] = useState(null);

  const initializePipeline = useCallback(async () => {
    try {
      if (!pipeline) {
        const featureExtractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        setPipeline(featureExtractor);
      }
      return true;
    } catch (error) {
      console.error('Failed to initialize face matching pipeline:', error);
      return false;
    }
  }, [pipeline]);

  const compareImages = useCallback(async (baselineImageUrl: string, attendanceImageUrl: string): Promise<FaceMatchResult> => {
    setIsLoading(true);
    
    try {
      // For now, we'll simulate face matching with a simple comparison
      // In production, you would use a proper face recognition service
      
      if (!baselineImageUrl || !attendanceImageUrl) {
        return {
          status: 'error',
          confidence: 0,
          color: 'red'
        };
      }

      // Simulate different match results based on image URLs (for demo)
      const random = Math.random();
      
      if (random > 0.7) {
        return {
          status: 'match',
          confidence: 85 + Math.random() * 15,
          color: 'green'
        };
      } else if (random > 0.4) {
        return {
          status: 'partial',
          confidence: 50 + Math.random() * 35,
          color: 'amber'
        };
      } else {
        return {
          status: 'nomatch',
          confidence: Math.random() * 50,
          color: 'red'
        };
      }
    } catch (error) {
      console.error('Face matching error:', error);
      return {
        status: 'error',
        confidence: 0,
        color: 'red'
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getMatchStatusIcon = (result: FaceMatchResult) => {
    switch (result.status) {
      case 'match':
        return '✅';
      case 'partial':
        return '⚠️';
      case 'nomatch':
      case 'error':
        return '❌';
      default:
        return '❓';
    }
  };

  const getMatchStatusText = (result: FaceMatchResult) => {
    switch (result.status) {
      case 'match':
        return `Match (${Math.round(result.confidence)}%)`;
      case 'partial':
        return `Partial (${Math.round(result.confidence)}%)`;
      case 'nomatch':
        return `No Match (${Math.round(result.confidence)}%)`;
      case 'error':
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  return {
    compareImages,
    isLoading,
    getMatchStatusIcon,
    getMatchStatusText,
    initializePipeline
  };
};