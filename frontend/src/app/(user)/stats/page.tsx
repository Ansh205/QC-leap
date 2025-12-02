'use client'

<<<<<<< HEAD
<<<<<<< HEAD
=======
import { useEffect, useState } from 'react'
>>>>>>> master
=======
import { useEffect, useState } from 'react'
>>>>>>> mail-services
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
<<<<<<< HEAD
<<<<<<< HEAD
=======
import { stats } from '@/lib/api'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
>>>>>>> master
=======
import { stats } from '@/lib/api'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
>>>>>>> mail-services

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

export default function StatsPage() {
<<<<<<< HEAD
<<<<<<< HEAD
  // ... (data and options definitions omitted for brevity) ...
  const data = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Defective',
        data: [12, 19, 3, 5, 2, 3, 8],
        backgroundColor: '#ef4444',
      },
      {
        label: 'Non-Defective',
        data: [20, 15, 25, 30, 22, 28, 32],
=======
=======
>>>>>>> mail-services
  const [loading, setLoading] = useState(true)
  const [statsData, setStatsData] = useState<any>(null)
  const [timeRange, setTimeRange] = useState('7days')

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        const days = parseInt(timeRange.replace('days', ''))
        const data = await stats.getOverview(days)
        setStatsData(data)
      } catch (error: any) {
        toast.error('Failed to load statistics: ' + error.message)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [timeRange])

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!statsData) {
    return (
      <div className="py-12 text-center">
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
<<<<<<< HEAD
>>>>>>> master
=======
>>>>>>> mail-services
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
<<<<<<< HEAD
<<<<<<< HEAD
          <p className="text-3xl font-bold mt-0.5">Stats</p>
=======
          <p className="mt-0.5 text-3xl font-bold">Stats</p>
>>>>>>> master
=======
          <p className="mt-0.5 text-3xl font-bold">Stats</p>
>>>>>>> mail-services
          <p className="text-slate-600">Defect Rate</p>

          {/* Counts */}
          <div className="mt-8 flex space-x-10">
            <div className="text-center">
<<<<<<< HEAD
<<<<<<< HEAD
              <p className="text-3xl font-semibold text-red-500">42</p>
              <p className="text-sm font-medium text-red-500">Defective</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-semibold text-green-600">120</p>
              <p className="text-sm font-medium text-green-600">Non-Defective</p>
=======
=======
>>>>>>> mail-services
              <p className="text-3xl font-semibold text-red-500">
                {statsData.total_images?.defective || 0}
              </p>
              <p className="text-sm font-medium text-red-500">Defective</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-semibold text-green-600">
                {statsData.total_images?.normal || 0}
              </p>
              <p className="text-sm font-medium text-green-600">Normal</p>
<<<<<<< HEAD
>>>>>>> master
=======
>>>>>>> mail-services
            </div>
          </div>
        </div>

<<<<<<< HEAD
<<<<<<< HEAD
        <Select defaultValue="7days">
=======
        <Select value={timeRange} onValueChange={setTimeRange}>
>>>>>>> master
=======
        <Select value={timeRange} onValueChange={setTimeRange}>
>>>>>>> mail-services
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
<<<<<<< HEAD
<<<<<<< HEAD
}
=======
}
>>>>>>> master
=======
}
>>>>>>> mail-services
