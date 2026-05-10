"use client"

import * as React from "react"
import { Drawer as DrawerPrimitive } from "vaul"

import { cn } from "@/lib/utils"

/** @typedef {import("react").ComponentPropsWithoutRef<typeof DrawerPrimitive.Root> & { shouldScaleBackground?: boolean }} DrawerProps */
/** @typedef {import("react").ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>} DrawerOverlayProps */
/** @typedef {import("react").ComponentPropsWithoutRef<typeof DrawerPrimitive.Content>} DrawerContentProps */
/** @typedef {import("react").ComponentPropsWithoutRef<"div">} DrawerDivProps */
/** @typedef {import("react").ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>} DrawerTitleProps */
/** @typedef {import("react").ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>} DrawerDescriptionProps */

/**
 * @param {DrawerProps} props
 */
const Drawer = ({
  shouldScaleBackground = true,
  ...props
}) => (
  <DrawerPrimitive.Root shouldScaleBackground={shouldScaleBackground} {...props} />
)
Drawer.displayName = "Drawer"

const DrawerTrigger = DrawerPrimitive.Trigger

const DrawerPortal = DrawerPrimitive.Portal

const DrawerClose = DrawerPrimitive.Close

/** @type {React.ForwardRefExoticComponent<DrawerOverlayProps & React.RefAttributes<any>>} */
const DrawerOverlay = React.forwardRef(function DrawerOverlay({ className, ...props }, ref) {
  return (
  <DrawerPrimitive.Overlay
    ref={ref}
    className={cn("fixed inset-0 z-[120] bg-black/80", className)}
    {...props} />
  );
})
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName

/** @type {React.ForwardRefExoticComponent<DrawerContentProps & React.RefAttributes<any>>} */
const DrawerContent = React.forwardRef(function DrawerContent({ className, children, ...props }, ref) {
  return (
  <DrawerPortal>
    <DrawerOverlay />
    <DrawerPrimitive.Content
      ref={ref}
      className={cn(
        "fixed inset-x-0 bottom-0 z-[130] mt-24 flex h-auto flex-col rounded-t-[10px] border bg-background",
        className
      )}
      {...props}>
      <div className="mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted" />
      {children}
    </DrawerPrimitive.Content>
  </DrawerPortal>
  );
})
DrawerContent.displayName = "DrawerContent"

/**
 * @param {DrawerDivProps} props
 */
const DrawerHeader = ({
  className,
  ...props
}) => (
  <div
    className={cn("grid gap-1.5 p-4 text-center sm:text-left", className)}
    {...props} />
)
DrawerHeader.displayName = "DrawerHeader"

/**
 * @param {DrawerDivProps} props
 */
const DrawerFooter = ({
  className,
  ...props
}) => (
  <div className={cn("mt-auto flex flex-col gap-2 p-4", className)} {...props} />
)
DrawerFooter.displayName = "DrawerFooter"

/** @type {React.ForwardRefExoticComponent<DrawerTitleProps & React.RefAttributes<any>>} */
const DrawerTitle = React.forwardRef(function DrawerTitle({ className, ...props }, ref) {
  return (
  <DrawerPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props} />
  );
})
DrawerTitle.displayName = DrawerPrimitive.Title.displayName

/** @type {React.ForwardRefExoticComponent<DrawerDescriptionProps & React.RefAttributes<any>>} */
const DrawerDescription = React.forwardRef(function DrawerDescription({ className, ...props }, ref) {
  return (
  <DrawerPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props} />
  );
})
DrawerDescription.displayName = DrawerPrimitive.Description.displayName

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}
