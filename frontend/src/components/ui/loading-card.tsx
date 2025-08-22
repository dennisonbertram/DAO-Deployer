import { Skeleton } from "./skeleton"
import { Card, CardContent, CardHeader } from "./card"

interface LoadingCardProps {
  showHeader?: boolean
  lines?: number
}

export function LoadingCard({ showHeader = true, lines = 3 }: LoadingCardProps) {
  return (
    <Card className="rounded-tally-container border-tally-gray-3">
      {showHeader && (
        <CardHeader className="pb-tally-2">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
      )}
      <CardContent className="space-y-tally-3">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </CardContent>
    </Card>
  )
}