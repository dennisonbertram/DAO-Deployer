import { Skeleton } from "./skeleton"
import { Card, CardContent, CardHeader } from "./card"

export function DeploymentFormSkeleton() {
  return (
    <div className="space-y-tally-6">
      <div className="mb-tally-8">
        <Skeleton className="h-8 w-1/3 mb-tally-4" />
        <Skeleton className="h-4 w-2/3" />
      </div>

      <Card className="rounded-tally-container border-tally-gray-3">
        <CardContent className="space-y-tally-6 py-tally-8">
          {/* Form fields */}
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-tally-2">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

export function DeploymentStatusSkeleton() {
  return (
    <Card className="rounded-tally-container border-tally-gray-3">
      <CardHeader>
        <Skeleton className="h-6 w-1/3" />
      </CardHeader>
      <CardContent className="space-y-tally-4">
        <div className="flex items-center space-x-tally-3">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </CardContent>
    </Card>
  )
}