import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Building2, Briefcase, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ConnectionScore {
  connectionId: string;
  organizationName: string;
  position: string;
  organizationScore: number;
  roleScore: number;
  totalScore: number;
  reasoning: string;
}

interface SocialCapitalBreakdownModalProps {
  open: boolean;
  onClose: () => void;
  totalScore: number;
  breakdown: ConnectionScore[];
  loading?: boolean;
}

export function SocialCapitalBreakdownModal({
  open,
  onClose,
  totalScore,
  breakdown,
  loading = false
}: SocialCapitalBreakdownModalProps) {
  const [expandedConnections, setExpandedConnections] = useState<Set<string>>(new Set());

  const toggleExpanded = (connectionId: string) => {
    setExpandedConnections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(connectionId)) {
        newSet.delete(connectionId);
      } else {
        newSet.add(connectionId);
      }
      return newSet;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="text-indigo-600" />
            Social Capital Score Breakdown
          </DialogTitle>
          <DialogDescription>
            Your score is calculated based on your featured connections' organizations and roles.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Total Score */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Social Capital Score</p>
                  <p className="text-3xl font-bold text-indigo-600">{totalScore}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600 mb-1">Featured Connections</p>
                  <p className="text-2xl font-semibold text-gray-700">{breakdown.length}</p>
                </div>
              </div>
            </div>

            {/* Connection Breakdown */}
            {breakdown.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No featured connections yet.</p>
                <p className="text-sm mt-2">Add featured connections to calculate your score.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-700 text-sm">Connection Scores</h3>
                {breakdown.map((connection) => {
                  const isExpanded = expandedConnections.has(connection.connectionId);
                  
                  return (
                    <div
                      key={connection.connectionId}
                      className="border rounded-lg p-4 hover:shadow-sm transition-shadow bg-white"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Building2 size={16} className="text-gray-500 flex-shrink-0" />
                            <span className="font-medium text-gray-900 truncate">
                              {connection.organizationName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mb-3">
                            <Briefcase size={16} className="text-gray-500 flex-shrink-0" />
                            <span className="text-sm text-gray-600 truncate">
                              {connection.position}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                Org: {connection.organizationScore}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                Role: {connection.roleScore}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Badge className="bg-indigo-600 text-white">
                                Total: {connection.totalScore}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Reasoning (expandable) */}
                      {connection.reasoning && (
                        <div className="mt-3 pt-3 border-t">
                          <button
                            onClick={() => toggleExpanded(connection.connectionId)}
                            className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp size={16} />
                                Hide AI Analysis
                              </>
                            ) : (
                              <>
                                <ChevronDown size={16} />
                                Show AI Analysis
                              </>
                            )}
                          </button>
                          {isExpanded && (
                            <div className="mt-2 text-sm text-gray-600 bg-gray-50 rounded p-3 leading-relaxed">
                              {connection.reasoning}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Score Legend */}
            <div className="bg-gray-50 rounded-lg p-4 mt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Scoring Guide</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600">
                <div>
                  <span className="font-medium">Organization (0-50):</span>
                  <p>Based on company size, market position, and reputation</p>
                </div>
                <div>
                  <span className="font-medium">Role (0-50):</span>
                  <p>Based on seniority and leadership level</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}







