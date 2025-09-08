import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  DollarSign,
  Activity,
  Calendar,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Eye,
  Edit,
  Trash2,
  Plus
} from 'lucide-react';
import { EquityValidationStatus } from '@/components/equity-validation-status';

interface MetricCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ElementType;
  trend?: 'up' | 'down';
}

function MetricCard({ title, value, change, changeType, icon: Icon, trend }: MetricCardProps) {
  return (
    <div className="card card-hover p-6 animate-scale-in">
      <div className="flex items-start justify-between mb-4">
        <div className={`
          p-3 rounded-lg 
          ${changeType === 'positive' ? 'bg-green-500/10 text-green-400' : 
            changeType === 'negative' ? 'bg-red-500/10 text-red-400' : 
            'bg-blue-500/10 text-blue-400'}
        `}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <div className={`
            p-1 rounded-full
            ${trend === 'up' ? 'bg-green-500/10' : 'bg-red-500/10'}
          `}>
            {trend === 'up' ? (
              <TrendingUp className="w-4 h-4 text-green-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-400" />
            )}
          </div>
        )}
      </div>
      
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-gray-400">{title}</h3>
        <div className="flex items-baseline gap-2">
          <span className={`
            text-2xl font-bold
            ${changeType === 'positive' ? 'profit' : 
              changeType === 'negative' ? 'loss' : 
              'text-white'}
          `}>
            {value}
          </span>
          {change && (
            <span className={`
              text-sm font-medium
              ${changeType === 'positive' ? 'text-green-400' : 
                changeType === 'negative' ? 'text-red-400' : 
                'text-gray-400'}
            `}>
              {change}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

interface TradeItemProps {
  id: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  pnl: number;
  percentage: number;
  time: string;
  tags?: string[];
}

function TradeItem({ symbol, direction, pnl, percentage, time, tags = [] }: TradeItemProps) {
  const isProfit = pnl > 0;
  
  return (
    <div className="card p-4 hover:bg-white/5 transition-colors group">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`
            w-2 h-8 rounded-full
            ${isProfit ? 'bg-green-500' : 'bg-red-500'}
          `} />
          
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white">{symbol}</span>
              <span className={`
                px-2 py-1 rounded-full text-xs font-medium
                ${direction === 'LONG' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}
              `}>
                {direction}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>{time}</span>
              {tags.length > 0 && (
                <div className="flex gap-1">
                  {tags.slice(0, 2).map(tag => (
                    <span key={tag} className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded text-xs">
                      {tag}
                    </span>
                  ))}
                  {tags.length > 2 && (
                    <span className="text-xs text-gray-500">+{tags.length - 2}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className={`font-bold ${isProfit ? 'profit' : 'loss'}`}>
              {isProfit ? '+' : ''}RM {Math.abs(pnl).toLocaleString()}
            </div>
            <div className={`text-sm ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
              {isProfit ? '+' : ''}{percentage.toFixed(1)}%
            </div>
          </div>
          
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
            <button className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
              <Eye className="w-4 h-4" />
            </button>
            <button className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
              <Edit className="w-4 h-4" />
            </button>
            <button className="p-2 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-400 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RiskAlert() {
  return (
    <div className="card p-4 bg-amber-500/10 border-amber-500/20">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
        <div className="space-y-1">
          <h4 className="font-semibold text-amber-400">Risk Alert</h4>
          <p className="text-sm text-amber-200">
            You've reached 85% of your daily loss limit. Consider reducing position sizes.
          </p>
        </div>
      </div>
    </div>
  );
}

function QuickActions() {
  const actions = [
    { label: 'Add Trade', icon: Plus, href: '/trades?action=add' },
    { label: 'View Calendar', icon: Calendar, href: '/calendar' },
    { label: 'Analytics', icon: BarChart3, href: '/analytics' },
    { label: 'Strategies', icon: Target, href: '/strategies' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {actions.map((action) => (
        <button
          key={action.label}
          className="card p-4 text-left hover:scale-105 transition-all duration-200 group hover:bg-white/10"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 transition-colors">
              <action.icon className="w-5 h-5" />
            </div>
            <span className="font-medium text-white group-hover:text-white">
              {action.label}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}

export function DashboardOverview() {
  // Enhanced demo data with modern structure
  const metrics = [
    {
      title: 'Total P/L',
      value: 'RM 23,450',
      change: '+12.3%',
      changeType: 'positive' as const,
      icon: DollarSign,
      trend: 'up' as const,
    },
    {
      title: 'Win Rate',
      value: '68.3%',
      change: '+2.1%',
      changeType: 'positive' as const,
      icon: Target,
      trend: 'up' as const,
    },
    {
      title: 'Max Drawdown',
      value: 'RM 2,100',
      change: '5.2%',
      changeType: 'negative' as const,
      icon: TrendingDown,
      trend: 'down' as const,
    },
    {
      title: 'Total Trades',
      value: '147',
      change: '+8 today',
      changeType: 'neutral' as const,
      icon: Activity,
    },
  ];

  const recentTrades = [
    {
      id: '1',
      symbol: 'AAPL',
      direction: 'LONG' as const,
      pnl: 250,
      percentage: 1.7,
      time: '10:30 AM',
      tags: ['Breakout', 'Momentum'],
    },
    {
      id: '2',
      symbol: 'TSLA',
      direction: 'SHORT' as const,
      pnl: -85,
      percentage: -0.8,
      time: '09:45 AM',
      tags: ['Reversal'],
    },
    {
      id: '3',
      symbol: 'MSFT',
      direction: 'LONG' as const,
      pnl: 320,
      percentage: 2.1,
      time: '09:15 AM',
      tags: ['Earnings', 'Tech'],
    },
    {
      id: '4',
      symbol: 'GOOGL',
      direction: 'LONG' as const,
      pnl: 125,
      percentage: 1.1,
      time: 'Yesterday',
      tags: ['Support'],
    },
  ];

  return (
    <div className="min-h-screen pt-20 pb-8">
      <div className="container-responsive space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white">
            Good morning, Trader! 👋
          </h1>
          <p className="text-gray-400">
            Here's what's happening with your trading performance today.
          </p>
        </div>

        {/* Today's Performance Banner */}
        <div className="card bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-blue-500/20 p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-white">Today's Performance</h3>
              <div className="flex items-center gap-4">
                <div className="text-2xl font-bold profit">+RM 1,250</div>
                <div className="flex items-center gap-1 text-green-400">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm font-medium">+3.2%</span>
                </div>
              </div>
            </div>
            <div className="text-right space-y-1">
              <div className="text-sm text-gray-400">3 trades • 2W 1L</div>
              <div className="text-sm text-blue-400">Risk: 2.1% used</div>
            </div>
          </div>
        </div>

        {/* Equity Validation */}
        <EquityValidationStatus />

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((metric) => (
            <MetricCard key={metric.title} {...metric} />
          ))}
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Quick Actions</h2>
          <QuickActions />
        </div>

        {/* Risk Alert */}
        <RiskAlert />

        {/* Recent Trades */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Recent Trades</h2>
            <button className="btn btn-ghost btn-sm">
              View All
            </button>
          </div>
          
          <div className="space-y-3">
            {recentTrades.map((trade) => (
              <TradeItem key={trade.id} {...trade} />
            ))}
          </div>
        </div>

        {/* Strategy Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Strategy Performance</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Momentum</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{width: '75%'}} />
                  </div>
                  <span className="text-sm font-medium text-green-400">+RM 850</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Reversal</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full" style={{width: '30%'}} />
                  </div>
                  <span className="text-sm font-medium text-red-400">-RM 120</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Breakout</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{width: '60%'}} />
                  </div>
                  <span className="text-sm font-medium text-blue-400">+RM 400</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Risk Management</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Daily Limit</span>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-gray-300">85% used</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Position Size</span>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-gray-300">Within limits</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Correlation</span>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span className="text-sm text-gray-300">Moderate</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
