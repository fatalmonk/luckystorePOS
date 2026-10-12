import * as React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from './sheet';
import { cn } from '@/lib/utils';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  preventOutsideClose?: boolean;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className,
  preventOutsideClose = false,
}) => {
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className={cn('w-full sm:max-w-xl max-w-full overflow-y-auto bg-card border-border', className, 'max-w-full')}
        onPointerDownOutside={(e) => {
          if (preventOutsideClose) {
            e.preventDefault();
          }
        }}
      >
        <SheetHeader className={title ? undefined : 'sr-only'}>
          <SheetTitle className="text-xl font-bold text-foreground">
            {title || 'Panel'}
          </SheetTitle>
        </SheetHeader>
        <div className="pt-4">{children}</div>
      </SheetContent>
    </Sheet>
  );
};
