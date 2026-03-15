import { useEffect, useState, useRef } from 'react'
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
import type { ApiUsageEntry, AgentSpendEntry, Budget } from '../env.d'

const api = window.electronAPI

interface SpendDay {
  date: string
  total: number
}

// ── BudgetBar ────────────────────────────────────────────────────────────────
interface BudgetBarProps {
  label: string
  spent: number
  limit: number | null
  onSave: (value: number | null) => void
}

function BudgetBar({ label, spent, limit, onSave }: BudgetBarProps): React.JSX.Element {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function startEdit(): void {
    setDraft(limit !== null ? String(limit) : '')
    setEditing(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function commit(): void {
    setEditing(false)
    const trimmed = draft.trim()
    if (trimmed === '' || trimmed === '0') {
      onSave(null)
    } else {
      const parsed = parseFloat(trimmed)
      if (!isNaN(parsed) && parsed > 0) onSave(parsed)
    }
  }

  function handleKey(e: React.KeyboardEvent): void {
    if (e.key === 'Enter') commit()
    if (e.key === 'Escape') setEditing(false)
  }

  const pct = limit !== null && limit > 0 ? Math.min((spent / limit) * 100, 100) : 0
  const isExceeded = limit !== null && spent > limit
  const isWarning = !isExceeded && pct >= 80

  const barColor = isExceeded
    ? '#f87171'
    : isWarning
      ? '#fb923c'
      : '#34d399'

  return (
    <div className="flex-1">
      <div className="flex items-center justify-between mb-2">
        <span className="section-label">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted font-mono">
            ${spent.toFixed(4)}
          </span>
          <span className="text-xs text-text-muted">/</span>
          {editing ? (
            <div className="flex items-center gap-1">
              <span className="text-xs text-text-muted">$</span>
              <input
                ref={inputRef}
                className="w-16 bg-white/[0.08] border border-white/[0.12] rounded px-1.5 py-0.5 text-xs text-text-primary font-mono outline-none focus:border-accent"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={handleKey}
                placeholder="0.00"
              />
            </div>
          ) : (
            <button
              onClick={startEdit}
              className="text-xs font-mono text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              title="Click to set limit"
            >
              {limit !== null ? `$${limit.toFixed(2)}` : 'No limit'}
            </button>
          )}
        </div>
      </div>

      {limit !== null ? (
        <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: barColor }}
          />
        </div>
      ) : (
        <div className="w-full h-1.5 rounded-full bg-white/[0.04]" />
      )}

      {(isExceeded || isWarning) && (
        <p className="mt-1 text-xs" style={{ color: barColor }}>
          {isExceeded
            ? `Over limit by $${(spent - limit!).toFixed(4)}`
            : `${pct.toFixed(0)}% of limit used`}
        </p>
      )}

      {limit === null && (
        <p className="mt-1 text-xs text-text-muted">
          Click value above to set a limit
        </p>
      )}
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function Metrics(): React.JSX.Element {
  const [todaySpend, setTodaySpend] = useState(0)
  const [monthlySpend, setMonthlySpend] = useState(0)
  const [sevenDaySpend, setSevenDaySpend] = useState<SpendDay[]>([])
  const [tokens, setTokens] = useState({ input_tokens: 0, output_tokens: 0, total_tokens: 0 })
  const [usageRows, setUsageRows] = useState<ApiUsageEntry[]>([])
  const [activeModel, setActiveModel] = useState('—')
  const [budget, setBudget] = useState<Budget>({ daily: null, monthly: null })
  const [agentSpend, setAgentSpend] = useState<AgentSpendEntry[]>([])
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)
  const [maxTokensInput, setMaxTokensInput] = useState('')
  const [historyDepthInput, setHistoryDepthInput] = useState('')

  async function load(): Promise<void> {
    try {
      const [today, monthly, sevenDay, tok, rows, model, bgt, agents, maxTok, histDepth] = await Promise.all([
        api.metrics.getTodaySpend(),
        api.metrics.getMonthlySpend(),
        api.metrics.get7DaySpend(),
        api.metrics.getTotalTokens(),
        api.metrics.getUsageByTask(20),
        api.metrics.getMostActiveModel(),
        api.metrics.getBudget(),
        api.metrics.getAgentSpend(),
        api.settings.get('max_tokens_per_request'),
        api.settings.get('context_history_depth'),
      ])
      setTodaySpend(today)
      setMonthlySpend(monthly)
      setSevenDaySpend(sevenDay)
      setTokens(tok)
      setUsageRows(rows)
      setActiveModel(model)
      setBudget(bgt)
      setAgentSpend(agents)
      setMaxTokensInput(maxTok ?? '')
      setHistoryDepthInput(histDepth ?? '')
    } catch (err) {
      console.error('Metrics load error:', err)
    }
  }

  useEffect(() => { load() }, [])

  async function handleBudgetSave(field: 'daily' | 'monthly', value: number | null): Promise<void> {
    const next = { ...budget, [field]: value }
    setBudget(next)
    await api.metrics.setBudget(next)
  }

  async function handleMaxTokensSave(): Promise<void> {
    await api.settings.set('max_tokens_per_request', maxTokensInput.trim())
  }

  async function handleHistoryDepthSave(): Promise<void> {
    await api.settings.set('context_history_depth', historyDepthInput.trim())
  }

  const sevenDayTotal = sevenDaySpend.reduce((sum, d) => sum + d.total, 0)

  const chartData = sevenDaySpend.map((d) => ({
    date: new Date(d.date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
    spend: parseFloat(d.total.toFixed(6))
  }))

  const dailyExceeded = budget.daily !== null && todaySpend > budget.daily
  const monthlyExceeded = budget.monthly !== null && monthlySpend > budget.monthly
  const anyExceeded = dailyExceeded || monthlyExceeded

  const maxAgentCost = agentSpend[0]?.total_cost ?? 0

  return (
    <div data-testid="metrics-page">
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">API Usage & Metrics</h1>
            <p className="page-subtitle">Real-time financial and token intelligence</p>
          </div>
          <button
            onClick={() => load()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-text-muted hover:text-text-primary bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] transition-all"
          >
            <i className="fa-solid fa-rotate-right" />
            Refresh
          </button>
        </div>
      </div>

      {/* Budget exceeded banner */}
      {anyExceeded && (
        <div className="mb-5 p-4 rounded-xl border border-red-500/30 bg-red-500/[0.08] backdrop-blur-sm flex items-center gap-3">
          <i className="fa-solid fa-triangle-exclamation text-red-400 text-sm" />
          <div>
            <p className="text-sm font-semibold text-red-300">Budget limit exceeded</p>
            <p className="text-xs text-red-400/80 mt-0.5">
              {[
                dailyExceeded && `Daily spend ($${todaySpend.toFixed(4)}) exceeds $${budget.daily?.toFixed(2)} limit`,
                monthlyExceeded && `Monthly spend ($${monthlySpend.toFixed(4)}) exceeds $${budget.monthly?.toFixed(2)} limit`
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        </div>
      )}

      {/* Top metric cards */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        <MetricCard
          label="Today's Spend"
          value={`$${todaySpend.toFixed(4)}`}
          icon="fa-solid fa-dollar-sign"
          accent="orange"
        />
        <MetricCard
          label="Monthly Spend"
          value={`$${monthlySpend.toFixed(4)}`}
          subtitle="Current month"
          icon="fa-solid fa-calendar-days"
          accent="blue"
        />
        <MetricCard
          label="Total Tokens (30d)"
          value={tokens.total_tokens.toLocaleString()}
          subtitle={`${tokens.input_tokens.toLocaleString()} in / ${tokens.output_tokens.toLocaleString()} out`}
          icon="fa-solid fa-hashtag"
        />
        <MetricCard label="Top Model" value={activeModel} icon="fa-solid fa-robot" />
      </div>

      {/* Budget controls */}
      <div className="card p-5 mb-5">
        <h2 className="text-sm font-semibold text-text-primary mb-4">Budget Limits</h2>
        <div className="flex items-start gap-6">
          <BudgetBar
            label="Daily"
            spent={todaySpend}
            limit={budget.daily}
            onSave={(v) => handleBudgetSave('daily', v)}
          />
          <div className="w-px self-stretch bg-white/[0.06]" />
          <BudgetBar
            label="Monthly"
            spent={monthlySpend}
            limit={budget.monthly}
            onSave={(v) => handleBudgetSave('monthly', v)}
          />
          <div className="w-px self-stretch bg-white/[0.06]" />
          {/* Context controls column */}
          <div className="flex-1 min-w-0 flex flex-col gap-4">
            {/* Per-request output token cap */}
            <div>
              <p className="text-xs text-text-muted mb-1">Max output tokens / request</p>
              <p className="text-xs text-text-muted mb-2 opacity-60">Hard cap on tokens the model can generate. Leave blank for model default (4096).</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={64}
                  max={200000}
                  placeholder="e.g. 2048"
                  value={maxTokensInput}
                  onChange={(e) => setMaxTokensInput(e.target.value)}
                  onBlur={handleMaxTokensSave}
                  onKeyDown={(e) => e.key === 'Enter' && handleMaxTokensSave()}
                  className="w-24 bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent/50"
                />
                <span className="text-xs text-text-muted">tokens</span>
              </div>
            </div>
            {/* Chat history depth */}
            <div>
              <p className="text-xs text-text-muted mb-1">Chat history depth</p>
              <p className="text-xs text-text-muted mb-2 opacity-60">Turns of conversation sent as context. Lower = fewer input tokens. Default 40.</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={200}
                  placeholder="40"
                  value={historyDepthInput}
                  onChange={(e) => setHistoryDepthInput(e.target.value)}
                  onBlur={handleHistoryDepthSave}
                  onKeyDown={(e) => e.key === 'Enter' && handleHistoryDepthSave()}
                  className="w-24 bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:border-accent/50"
                />
                <span className="text-xs text-text-muted">turns</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart + Agent spend row */}
      <div className="grid grid-cols-5 gap-5 mb-5">
        {/* 7-day chart — 3 cols */}
        <div className="col-span-3 card p-5">
          <h2 className="text-sm font-semibold text-text-primary mb-4">7-Day Spend</h2>
          {chartData.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-text-muted text-sm">
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

        {/* Agent spend breakdown — 2 cols */}
        <div className="col-span-2 card p-5">
          <h2 className="text-sm font-semibold text-text-primary mb-4">Agent Spend (30d)</h2>
          {agentSpend.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-text-muted text-sm">
              No agent activity yet
            </div>
          ) : (
            <div className="space-y-3">
              {agentSpend.map((agent) => {
                const pct = maxAgentCost > 0 ? (agent.total_cost / maxAgentCost) * 100 : 0
                return (
                  <div key={agent.agent_id ?? 'unknown'}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base leading-none">{agent.agent_avatar ?? '🤖'}</span>
                        <span className="text-xs text-text-primary">{agent.agent_name ?? 'Unknown'}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-mono text-accent-green">${agent.total_cost.toFixed(4)}</span>
                        <span className="text-xs text-text-muted ml-1.5">{agent.total_tokens.toLocaleString()} tok</span>
                      </div>
                    </div>
                    <div className="w-full h-1 rounded-full bg-white/[0.05] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-accent transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Per-task breakdown */}
      <div className="card">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary">Per-Task Breakdown</h2>
          <span className="text-xs text-text-muted">Last 20 calls</span>
        </div>
        {usageRows.length === 0 ? (
          <div className="p-10 text-center text-text-muted text-sm">
            <i className="fa-solid fa-chart-bar text-2xl mb-3 block opacity-30" />
            No API usage recorded yet
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-5 py-3 text-left text-xs text-text-muted font-medium">Task</th>
                <th className="px-5 py-3 text-left text-xs text-text-muted font-medium">Agent</th>
                <th className="px-5 py-3 text-left text-xs text-text-muted font-medium">Model</th>
                <th className="px-5 py-3 text-right text-xs text-text-muted font-medium">Tokens</th>
                <th className="px-5 py-3 text-right text-xs text-text-muted font-medium">Cost</th>
                <th className="px-5 py-3 text-right text-xs text-text-muted font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {usageRows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-white/[0.04] transition-colors"
                  style={{ background: hoveredRow === row.id ? 'rgba(255,255,255,0.04)' : undefined }}
                  onMouseEnter={() => setHoveredRow(row.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  <td className="px-5 py-3 text-text-primary truncate max-w-[180px]">
                    {row.task_title || <span className="text-text-muted">—</span>}
                  </td>
                  <td className="px-5 py-3 text-text-muted text-xs">
                    {row.agent_name || <span className="opacity-40">—</span>}
                  </td>
                  <td className="px-5 py-3 text-text-muted font-mono text-xs">{row.model}</td>
                  <td className="px-5 py-3 text-right text-text-muted tabular-nums">
                    {(row.input_tokens + row.output_tokens).toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-xs tabular-nums" style={{ color: '#34d399' }}>
                    ${row.cost_usd.toFixed(6)}
                  </td>
                  <td className="px-5 py-3 text-right text-text-muted text-xs tabular-nums">
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
