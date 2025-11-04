'use client'

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

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

export default function StatsPage() {
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
    <div className="min-h-screen space-y-8 bg-white py-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Stats</h1>

          {/* Counts */}
          <div className="mt-8 flex space-x-10">
            <div className="text-center">
              <p className="text-3xl font-semibold text-red-500">42</p>
              <p className="text-sm font-medium text-red-500">Defective</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-semibold text-green-600">120</p>
              <p className="text-sm font-medium text-green-600">Non-Defective</p>
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

      <Card className="flex h-[400px] w-full items-center justify-center p-6">
        <Bar data={data} options={options} />
      </Card>
    </div>
  )
}
