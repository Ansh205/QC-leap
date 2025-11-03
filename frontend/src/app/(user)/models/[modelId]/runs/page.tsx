import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'

const runs = [
  {
    id: '51',
    name: 'Run-51',
    description:
      "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s.",
    images: [
      '/placeholder-image.png',
      '/placeholder-image.png',
      '/placeholder-image.png',
      '/placeholder-image.png',
    ],
  },
  {
    id: '52',
    name: 'Run-52',
    description:
      "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s.",
    images: [
      '/placeholder-image.png',
      '/placeholder-image.png',
      '/placeholder-image.png',
      '/placeholder-image.png',
    ],
  },
]

export default function ModelRunsPage() {
  return (
    <div className="pt-8">
      <p className="text-slate-600">Inspection Model / Runs</p>
      <div className="mt-0.5 flex justify-between">
        <p className="text-3xl font-bold">QCL-1</p>
        <div className="flex gap-5">
          <Link href={'./'}>
            <Button className="w-40 bg-slate-200 text-black" variant={'outline'}>
              View Model
            </Button>
          </Link>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
        {runs.map((run) => (
          <Card key={run.id} className="relative pt-0">
            <div className="overflow-hidden rounded-t-md">
              <div className="grid h-60 grid-cols-2 grid-rows-2">
                {run.images.map((src, i) => (
                  <div key={i} className="flex items-center justify-center">
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
            <CardContent>
              <div className="item-center relative flex justify-between">
                <h3 className="text-lg font-semibold">{run.name}</h3>
                <Link href={`./runs/${run.id}`}>
                  <Button size={'sm'} variant={'outline'} className="absolute right-0 -mt-2 w-28">
                    View
                  </Button>
                </Link>
              </div>
              <p className="mt-2 text-sm text-gray-600">{run.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
