import * as React from "react"
import { GripVertical } from "lucide-react"
import * as ResizablePrimitive from "react-resizable-panels"

import { cn } from "@/lib/utils"

const ResizablePanelGroup = ({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.Group>) => (
  <ResizablePrimitive.Group
    orientation={orientation}
    className={cn(
      "flex h-full w-full data-[orientation=vertical]:flex-col",
      className
    )}
    {...props}
  />
)

const ResizablePanel = ResizablePrimitive.Panel

const ResizableHandle = ({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.Separator> & {
  withHandle?: boolean
}) => (
  <ResizablePrimitive.Separator
    className={cn(
      "relative flex w-px items-center justify-center bg-border transition-colors hover:bg-primary/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 data-[orientation=vertical]:h-px data-[orientation=vertical]:w-full after:absolute after:inset-y-0 after:left-1/2 after:w-2 after:-translate-x-1/2 data-[orientation=vertical]:after:left-0 data-[orientation=vertical]:after:h-2 data-[orientation=vertical]:after:w-full data-[orientation=vertical]:after:-translate-y-1/2 data-[orientation=vertical]:after:translate-x-0 cursor-col-resize data-[orientation=vertical]:cursor-row-resize",
      className
    )}
    {...props}
  >
    {withHandle && (
      <div className="z-10 flex h-5 w-3.5 items-center justify-center rounded-sm border bg-background shadow-xs hover:border-primary">
        <GripVertical className="h-3 w-3 text-muted-foreground" />
      </div>
    )}
  </ResizablePrimitive.Separator>
)

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
