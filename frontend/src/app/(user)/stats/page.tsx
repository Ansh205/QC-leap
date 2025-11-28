'use client'

import { useEffect, useState } from 'react'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { stats } from '@/lib/api'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

export default function StatsPage() {
  const [loading, setLoading] = useState(true)
  const [statsData, setStatsData] = useState<any>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await stats.getOverview()
        setStatsData(data)
      } catch (error: any) {
        toast.error('Failed to load statistics: ' + error.message)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!statsData) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Failed to load statistics</p>
      </div>
    )
  }

  const data = {
    labels: statsData.daily_inspections?.map((d: any) => d.day_label) || [],
    datasets: [
      {
        label: 'Defective',
        data: statsData.daily_inspections?.map((d: any) => d.defective) || [],
        backgroundColor: '#ef4444',
      },
      {
        label: 'Normal',
        data: statsData.daily_inspections?.map((d: any) => d.normal) || [],
        backgroundColor: '#22c55e',
      },
    ],
  }

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: { size: 13 },
          color: '#374151',
        },
      },
      title: {
        display: false,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#6b7280' },
      },
      y: {
        grid: { color: '#e5e7eb' },
        ticks: { color: '#6b7280' },
      },
    },
  }

  return (
    <div className="space-y-8 pt-8">
      {/* Header section starts */}
      <div className="flex items-start justify-between">
        <div>
          {/* ADDED DESCRIPTIVE TEXT */}
          <p className="text-3xl font-bold mt-0.5">Stats</p>
          <p className="text-slate-600">Defect Rate</p>

          {/* Counts */}
          <div className="mt-8 flex space-x-10">
            <div className="text-center">
              <p className="text-3xl font-semibold text-red-500">{statsData.total_images?.defective || 0}</p>
              <p className="text-sm font-medium text-red-500">Defective</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-semibold text-green-600">{statsData.total_images?.normal || 0}</p>
              <p className="text-sm font-medium text-green-600">Normal</p>
            </div>
          </div>
        </div>

        <Select defaultValue="7days">
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Last 7 days" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7days">Last 7 days</SelectItem>
            <SelectItem value="30days">Last 30 days</SelectItem>
            <SelectItem value="90days">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {/* Header section ends */}

      <Card className="flex h-[400px] w-full items-center justify-center p-6">
        <Bar data={data} options={options} />
      </Card>
    </div>
  )
}