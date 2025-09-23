import { ConnectionRequest } from '@/hooks/useRequests';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface RequestStatsChartProps {
  requests: ConnectionRequest[];
}

const RequestStatsChart = ({ requests }: RequestStatsChartProps) => {
  // Generate status distribution data from real request data
  const generateStatusData = () => {
    const active = requests.filter(r => r.status === 'active' && !r.isExpired).length;
    const completed = requests.filter(r => r.status === 'completed').length;
    const expired = requests.filter(r => r.isExpired || r.status === 'expired').length;
    const cancelled = requests.filter(r => r.status === 'cancelled').length;

    return [
      { name: 'Active', value: active, color: '#3b82f6' },
      { name: 'Completed', value: completed, color: '#10b981' },
      { name: 'Expired', value: expired, color: '#f59e0b' },
      { name: 'Cancelled', value: cancelled, color: '#ef4444' },
    ].filter(item => item.value > 0);
  };

  // Generate performance data per request using real data
  const generatePerformanceData = () => {
    return requests.slice(0, 5).map((request) => ({
      name: request.target.length > 15 ? request.target.substring(0, 15) + '...' : request.target,
      reward: request.reward,
      status: request.status,
      createdAt: request.createdAt,
    }));
  };

  const statusData = generateStatusData();
  const performanceData = generatePerformanceData();

  if (requests.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No data available to display charts</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Request Status Distribution */}
      {statusData.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Request Status Distribution</h4>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  outerRadius={60}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                  fontSize={12}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Request Rewards */}
      {performanceData.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Request Rewards</h4>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  stroke="#64748b"
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  stroke="#64748b"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value, name) => [
                    `$${value}`,
                    'Reward ($)'
                  ]}
                />
                <Bar dataKey="reward" fill="#3b82f6" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export { RequestStatsChart };