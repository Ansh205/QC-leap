import { Button } from '@/components/ui/button'

interface TrainingProps {
  modelId: number
}

export default function Training({ modelId }: TrainingProps) {
  // TODO: Implement training functionality
  // - Display training progress
  // - Show training metrics (loss, accuracy, etc.)
  // - Start/stop training buttons

  return (
    <div className="max-w-xl space-y-6">
      <p className="text-muted-foreground text-[15px] leading-relaxed">
        Training functionality will be implemented as part of Sprint 3 and Sprint 4.
        This will include model training with synthetic data generation and ViT-based defect detection.
      </p>

      <Button className="bg-green-600 text-white hover:bg-green-500">Start Training</Button>
    </div>
  )
}
