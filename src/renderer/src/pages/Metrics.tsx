import { useEffect, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'
import MetricCard from '../components/MetricCard'
import type { ApiUsageEntry } from '../env.d'

const api = window.electronAPI

interface SpendDay {
  date: string
  total: number
}

export default function Metrics(): React.JSX.Element {
  const [todaySpend, setTodaySpend] = useState(0)
  const [sevenDaySpend, setSevenDaySpend] = useState<SpendDay[]>([])
  const [tokens, setTokens] = useState({ input_tokens: 0, output_tokens: 0, total_tokens: 0 })
  const [usageRows, setUsageRows] = useState<ApiUsageEntry[]>([])
  const [activeModel, setActiveModel] = useState('—')

  useEffect(() => {
    async function load(): Promise<void> {
      try {
        const [today, sevenDay, tok, rows, model] = await Promise.all([
          api.metrics.getTodaySpend(),
          api.metrics.get7DaySpend(),
          api.metrics.getTotalTokens(),
          api.metrics.getUsageByTask(20),
          api.metrics.getMostActiveModel()
        ])
        setTodaySpend(today)
        setSevenDaySpend(sevenDay)
        setTokens(tok)
        setUsageRows(rows)
        setActiveModel(model)
      } catch (err) {
        console.error('Metrics load error:', err)
      }
    }
    load()
  }, [])

  const sevenDayTotal = sevenDaySpend.reduce((sum, d) => sum + d.total, 0)

  const chartData = sevenDaySpend.map((d) => ({
    date: new Date(d.date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
    spend: parseFloat(d.total.toFixed(6))
  }))

  return (
    <div data-testid="metrics-page">
      <div className="page-header">
        <h1 className="page-title">API Usage & Metrics</h1>
        <p className="page-subtitle">Real-time financial and token intelligence</p>
      </div>

      {/* Top cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricCard
          label="Today's Spend"
          value={`$${todaySpend.toFixed(4)}`}
          icon="fa-solid fa-dollar-sign"
          accent="orange"
        />
        <MetricCard
          label="7-Day Billing"
          value={`$${sevenDayTotal.toFixed(4)}`}
          subtitle="Past 7 days"
          icon="fa-solid fa-calendar-days"
          accent="blue"
        />
        <MetricCard
          label="Monthly Tokens"
          value={tokens.total_tokens.toLocaleString()}
          subtitle={`${tokens.input_tokens.toLocaleString()} in / ${tokens.output_tokens.toLocaleString()} out`}
          icon="fa-solid fa-hashtag"
        />
        <MetricCard label="Top Model" value={activeModel} icon="fa-solid fa-robot" />
      </div>

      {/* 7-day chart */}
      <div className="card p-5 mb-6">
        <h2 className="text-sm font-semibold text-text-primary mb-4">7-Day Spend</h2>
        {chartData.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-text-muted text-sm">
            No data yet — run a task to see spend
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${v}`}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 12,
                  color: '#e2e8f0',
                  fontSize: 12
                }}
                formatter={(v: number) => [`$${v.toFixed(6)}`, 'Spend']}
              />
              <Bar dataKey="spend" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Per-task breakdown */}
      <div className="card">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-text-primary">Per-Task Breakdown</h2>
        </div>
        {usageRows.length === 0 ? (
          <div className="p-6 text-center text-text-muted text-sm">
            No API usage recorded yet
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-5 py-3 text-left text-xs text-text-muted font-medium">Task</th>
                <th className="px-5 py-3 text-left text-xs text-text-muted font-medium">Model</th>
                <th className="px-5 py-3 text-right text-xs text-text-muted font-medium">Tokens</th>
                <th className="px-5 py-3 text-right text-xs text-text-muted font-medium">Cost</th>
                <th className="px-5 py-3 text-right text-xs text-text-muted font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {usageRows.map((row) => (
                <tr key={row.id} className="border-b border-white/[0.04] hover:bg-white/[0.04] transition-colors">
                  <td className="px-5 py-3 text-text-primary truncate max-w-xs">
                    {row.task_title || '—'}
                  </td>
                  <td className="px-5 py-3 text-text-muted font-mono text-xs">{row.model}</td>
                  <td className="px-5 py-3 text-right text-text-muted">
                    {(row.input_tokens + row.output_tokens).toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-right text-accent-green font-mono text-xs">
                    ${row.cost_usd.toFixed(6)}
                  </td>
                  <td className="px-5 py-3 text-right text-text-muted text-xs">
                    {new Date(row.timestamp).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
