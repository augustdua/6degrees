import { useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/social-capital/calculate/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to calculate score');
      }

      const data = await response.json();
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
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/social-capital/breakdown/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch breakdown');
      }

      const data = await response.json();
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
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/social-capital/score-connection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          organizationName,
          position,
          organizationDomain
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to score connection');
      }

      const data = await response.json();
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

