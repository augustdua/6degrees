import { ConnectionRequest } from '@/hooks/useRequests';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface RequestStatsChartProps {
  requests: ConnectionRequest[];
}

const RequestStatsChart = ({ requests }: RequestStatsChartProps) => {
  // Generate mock click data for demonstration
  const generateClickData = () => {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      last7Days.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        clicks: Math.floor(Math.random() * 50) + 10,
        shares: Math.floor(Math.random() * 10) + 1,
      });
    }
    return last7Days;
  };

  // Generate status distribution data
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

  // Generate performance data per request
  const generatePerformanceData = () => {
    return requests.slice(0, 5).map((request, index) => ({
      name: request.target.length > 15 ? request.target.substring(0, 15) + '...' : request.target,
      clicks: Math.floor(Math.random() * 100) + 10,
      conversions: Math.floor(Math.random() * 20) + 1,
      reward: request.reward,
    }));
  };

  const clickData = generateClickData();
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
      {/* Click Trends */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">7-Day Click Trends</h4>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={clickData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                stroke="#64748b"
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
              />
              <Line
                type="monotone"
                dataKey="clicks"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="shares"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>Clicks</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Shares</span>
          </div>
        </div>
      </div>

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

      {/* Performance per Request */}
      {performanceData.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Top Performing Requests</h4>
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
                    value,
                    name === 'clicks' ? 'Clicks' :
                    name === 'conversions' ? 'Conversions' :
                    'Reward ($)'
                  ]}
                />
                <Bar dataKey="clicks" fill="#3b82f6" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export { RequestStatsChart };