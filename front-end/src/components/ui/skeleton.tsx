import type * as React from "react"

import { cn } from "../../lib/utils"

const Skeleton = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("animate-pulse rounded-2xl bg-muted", className)}
    {...props}
  />
)

export { Skeleton }
