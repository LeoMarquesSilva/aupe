import React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & { sx?: object }
>(({ className, sx, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    {...props}
    style={undefined}
  />
));
TabsList.displayName = 'TabsList';

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & { sx?: object }
>(({ className, sx, ...props }, ref) => (
  <TabsPrimitive.Trigger ref={ref} {...props} style={undefined} />
));
TabsTrigger.displayName = 'TabsTrigger';

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content> & { sx?: object }
>(({ className, sx, ...props }, ref) => (
  <TabsPrimitive.Content ref={ref} {...props} style={undefined} />
));
TabsContent.displayName = 'TabsContent';

export { Tabs, TabsList, TabsTrigger, TabsContent };
