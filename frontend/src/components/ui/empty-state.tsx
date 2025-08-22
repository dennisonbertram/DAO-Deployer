import { Button } from "./button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card"

interface EmptyStateProps {
  title: string
  description: string
  icon?: React.ReactNode
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <Card className="rounded-tally-container border-tally-gray-3">
      <CardContent className="flex flex-col items-center justify-center py-tally-15 text-center">
        {icon && (
          <div className="mb-tally-6 p-tally-4 rounded-full bg-tally-gray-2">
            {icon}
          </div>
        )}
        <CardTitle className="mb-tally-3 text-tally-gray-8">
          {title}
        </CardTitle>
        <CardDescription className="mb-tally-6 max-w-md text-tally-gray-6">
          {description}
        </CardDescription>
        {action && (
          <Button onClick={action.onClick} className="rounded-tally-button">
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}