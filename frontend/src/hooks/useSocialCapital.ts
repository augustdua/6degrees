import { useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';

interface ConnectionScore {
  connectionId: string;
  organizationName: string;
  position: string;
  organizationScore: number;
  roleScore: number;
  totalScore: number;
  reasoning: string;
}

interface ScoreBreakdown {
  score: number;
  breakdown: ConnectionScore[];
  updatedAt: string | null;
}

interface ScoreConnectionResult {
  organizationScore: number;
  roleScore: number;
  totalScore: number;
  reasoning: string;
}

export const useSocialCapital = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Calculate or recalculate a user's social capital score
   */
  const calculateScore = async (userId: string): Promise<number> => {
    setLoading(true);
    setError(null);

    try {
      const data = await apiPost(`/api/social-capital/calculate/${userId}`, {});
      return data.score;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to calculate social capital score';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get detailed score breakdown for a user
   */
  const getBreakdown = async (userId: string): Promise<ScoreBreakdown> => {
    setLoading(true);
    setError(null);

    try {
      const data = await apiGet(`/api/social-capital/breakdown/${userId}`);
      return data;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch score breakdown';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Score a single connection (preview before adding)
   */
  const scoreConnection = async (
    organizationName: string,
    position: string,
    organizationDomain?: string
  ): Promise<ScoreConnectionResult> => {
    setLoading(true);
    setError(null);

    try {
      const data = await apiPost('/api/social-capital/score-connection', {
        organizationName,
        position,
        organizationDomain
      });
      return data;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to score connection';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    calculateScore,
    getBreakdown,
    scoreConnection,
    loading,
    error
  };
};

