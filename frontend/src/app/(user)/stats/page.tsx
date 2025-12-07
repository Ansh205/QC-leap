'use client'

import { useEffect, useState } from 'react'
import { Bar, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  ArcElement,
} from 'chart.js'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { stats, models as modelsAPI } from '@/lib/api'
import { toast } from 'sonner'
import { Loader2, BarChart3, AlertCircle, CheckCircle2, Percent, BrainCircuit, PieChart } from 'lucide-react'

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend)

export default function StatsPage() {
  const [loading, setLoading] = useState(true)
  const [statsData, setStatsData] = useState<any>(null)
  const [modelStats, setModelStats] = useState({ count: 0, avgAccuracy: 0 })
  const [timeRange, setTimeRange] = useState('7days')

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const days = parseInt(timeRange.replace('days', ''))

        const [overviewData, modelsList] = await Promise.all([
          stats.getOverview(days),
          modelsAPI.list()
        ])

        setStatsData(overviewData)

        const readyModels = modelsList.filter(m => m.status === 'ready' && m.accuracy)
        const totalAccuracy = readyModels.reduce((acc, m) => acc + (parseFloat(m.accuracy || '0')), 0)
        const avgAccuracy = readyModels.length > 0 ? totalAccuracy / readyModels.length : 0

        setModelStats({
          count: modelsList.length,
          avgAccuracy
        })

      } catch (error: any) {
        toast.error('Failed to load data: ' + error.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [timeRange])

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="text-primary h-8 w-8 animate-spin" /></div>
  if (!statsData) return <div className="flex h-96 items-center justify-center text-slate-500">Failed to load data</div>

  const dailyInspections = statsData.daily_inspections || []
  const hasChartData = dailyInspections.length > 0
  const totalDefective = statsData.total_images?.defective || 0
  const totalNormal = statsData.total_images?.normal || 0
  const totalProcessed = totalDefective + totalNormal
  const defectRate = totalProcessed > 0 ? ((totalDefective / totalProcessed) * 100).toFixed(1) : '0.0'

  const barData = {
    labels: dailyInspections.map((d: any) => d.day_label || ''),
    datasets: [
      { label: 'Defective', data: dailyInspections.map((d: any) => Number(d.defective || 0)), backgroundColor: '#ef4444', borderRadius: 4, barPercentage: 0.6, categoryPercentage: 0.8 },
      { label: 'Normal', data: dailyInspections.map((d: any) => Number(d.normal || 0)), backgroundColor: '#22c55e', borderRadius: 4, barPercentage: 0.6, categoryPercentage: 0.8 },
    ],
  }

  const doughnutData = {
    labels: ['Normal', 'Defective'],
    datasets: [{ data: [totalNormal, totalDefective], backgroundColor: ['#22c55e', '#ef4444'], borderColor: ['#ffffff', '#ffffff'], borderWidth: 2 }],
  }

  const barOptions: any = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1e293b', padding: 8, cornerRadius: 6 } }, scales: { x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 10 } }, border: { display: false } }, y: { grid: { color: '#f1f5f9' }, ticks: { color: '#64748b', font: { size: 10 }, precision: 0 }, border: { display: false, dash: [4, 4] } } }, interaction: { mode: 'index', intersect: false } }
  const doughnutOptions: any = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 8, font: { size: 11 } } } }, cutout: '75%' }

  return (
    // UPDATED: pt-0 to stick to layout padding
    <div className="space-y-3 pt-0 animate-in fade-in duration-500 max-w-7xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
        <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Stats</h1>
        <p className="text-xs text-slate-500">Real-time insights into your quality control process.</p>
        </div>

        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-32 h-7 text-xs bg-white shadow-sm border-gray-200"><SelectValue placeholder="Range" /></SelectTrigger>
          <SelectContent><SelectItem value="7days">Last 7 days</SelectItem><SelectItem value="30days">Last 30 days</SelectItem><SelectItem value="90days">Last 90 days</SelectItem></SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
         <Card className="shadow-sm border-l-4 border-l-blue-500 bg-white hover:shadow-md transition-shadow">
            <CardContent className="p-3">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Processed</p>
                        <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{totalProcessed}</h3>
                    </div>
                    <div className="p-1.5 bg-blue-50 rounded-md text-blue-600"><BarChart3 className="h-4 w-4" /></div>
                </div>
            </CardContent>
         </Card>

         <Card className="shadow-sm border-l-4 border-l-orange-500 bg-white hover:shadow-md transition-shadow">
            <CardContent className="p-3">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Defect Rate</p>
                        <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{defectRate}%</h3>
                    </div>
                    <div className="p-1.5 bg-orange-50 rounded-md text-orange-600"><Percent className="h-4 w-4" /></div>
                </div>
            </CardContent>
         </Card>

         <Card className="shadow-sm border-l-4 border-l-purple-500 bg-white hover:shadow-md transition-shadow">
            <CardContent className="p-3">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Models</p>
                        <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{modelStats.count}</h3>
                    </div>
                    <div className="p-1.5 bg-purple-50 rounded-md text-purple-600"><BrainCircuit className="h-4 w-4" /></div>
                </div>
            </CardContent>
         </Card>

          <Card className="shadow-sm border-l-4 border-l-green-500 bg-white hover:shadow-md transition-shadow">
            <CardContent className="p-3">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Avg Accuracy</p>
                        <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{modelStats.avgAccuracy.toFixed(1)}%</h3>
                    </div>
                    <div className="p-1.5 bg-green-50 rounded-md text-green-600"><CheckCircle2 className="h-4 w-4" /></div>
                </div>
            </CardContent>
         </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <Card className="p-3 shadow-sm lg:col-span-2 h-[320px] border border-gray-100">
            <div className="flex flex-col h-full w-full">
                <div className="mb-2"><h3 className="text-xs font-semibold text-gray-900">Inspection Volume</h3></div>
                <div className="relative flex-1 w-full min-h-0">
                    {!hasChartData ? <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-slate-400 bg-slate-50/50 rounded-lg border border-dashed border-slate-200"><p className="text-xs">No data available</p></div> : <Bar data={barData} options={barOptions} />}
                </div>
            </div>
          </Card>

          <Card className="p-3 shadow-sm h-[320px] border border-gray-100">
            <div className="flex flex-col h-full w-full">
                <div className="mb-2"><h3 className="text-xs font-semibold text-gray-900">Defect Distribution</h3></div>
                <div className="relative flex-1 w-full min-h-0 flex items-center justify-center">
                    {totalProcessed === 0 ? <div className="flex flex-col items-center justify-center text-center text-slate-400"><p className="text-xs">No data available</p></div> : <Doughnut data={doughnutData} options={doughnutOptions} />}
                </div>
            </div>
          </Card>
      </div>
    </div>
  )
}