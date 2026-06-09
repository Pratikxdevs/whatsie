import React, { useCallback, useEffect, useRef } from "react"
import { motion, useMotionTemplate, useMotionValue } from "motion/react"
import { cn } from "@/lib/utils"

interface CursorCardsContainerProps {
  children: React.ReactNode
  className?: string
  proximityRange?: number
}

interface CursorCardProps {
  children?: React.ReactNode
  className?: string
  illuminationRadius?: number
  illuminationColor?: string
  illuminationOpacity?: number
  primaryHue?: string
  secondaryHue?: string
  borderColor?: string
}

interface InternalCursorCardProps extends CursorCardProps {
  globalMouseX?: number
  globalMouseY?: number
  isWithinRange?: boolean
}

function useMousePosition(proximityRange: number) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [mouseState, setMouseState] = React.useState({
    mousePositionX: 0,
    mousePositionY: 0,
    isWithinRange: false,
  })

  const handlePointerMovement = useCallback(
    (event: PointerEvent) => {
      if (!wrapperRef.current) return
      const bounds = wrapperRef.current.getBoundingClientRect()
      const { clientX, clientY } = event
      const isInProximity =
        clientX >= bounds.left - proximityRange &&
        clientX <= bounds.right + proximityRange &&
        clientY >= bounds.top - proximityRange &&
        clientY <= bounds.bottom + proximityRange
      setMouseState({
        mousePositionX: clientX,
        mousePositionY: clientY,
        isWithinRange: isInProximity,
      })
    },
    [proximityRange]
  )

  useEffect(() => {
    document.addEventListener("pointermove", handlePointerMovement)
    return () => document.removeEventListener("pointermove", handlePointerMovement)
  }, [handlePointerMovement])

  return { wrapperRef, mouseState }
}

function useCardActivation(
  elementRef: React.RefObject<HTMLDivElement | null>,
  globalMouseX: number,
  globalMouseY: number,
  isWithinRange: boolean,
  illuminationRadius: number
) {
  const localMouseX = useMotionValue(-illuminationRadius)
  const localMouseY = useMotionValue(-illuminationRadius)
  const [isCardActive, setIsCardActive] = React.useState(false)

  useEffect(() => {
    if (!elementRef.current || !isWithinRange) {
      setIsCardActive(false)
      localMouseX.set(-illuminationRadius)
      localMouseY.set(-illuminationRadius)
      return
    }
    const rect = elementRef.current.getBoundingClientRect()
    const extendedProximity = 100
    const isNearCard =
      globalMouseX >= rect.left - extendedProximity &&
      globalMouseX <= rect.right + extendedProximity &&
      globalMouseY >= rect.top - extendedProximity &&
      globalMouseY <= rect.bottom + extendedProximity
    setIsCardActive(isNearCard)
    if (isNearCard) {
      localMouseX.set(globalMouseX - rect.left)
      localMouseY.set(globalMouseY - rect.top)
    } else {
      localMouseX.set(-illuminationRadius)
      localMouseY.set(-illuminationRadius)
    }
  }, [globalMouseX, globalMouseY, isWithinRange, illuminationRadius, localMouseX, localMouseY])

  return { localMouseX, localMouseY, isCardActive }
}

export function CursorCardsContainer({
  children,
  className,
  proximityRange = 400,
}: CursorCardsContainerProps) {
  const { wrapperRef, mouseState } = useMousePosition(proximityRange)

  const enhancedChildren = React.Children.map(children, (child) => {
    if (React.isValidElement(child) && child.type === CursorCard) {
      return React.cloneElement(
        child as React.ReactElement<InternalCursorCardProps>,
        {
          globalMouseX: mouseState.mousePositionX,
          globalMouseY: mouseState.mousePositionY,
          isWithinRange: mouseState.isWithinRange,
        }
      )
    }
    return child
  })

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      {enhancedChildren}
    </div>
  )
}

export function CursorCard({
  children,
  className,
  illuminationRadius = 220,
  illuminationColor = "rgba(255,255,255,0.06)",
  illuminationOpacity = 1,
  primaryHue = "rgba(255,255,255,0.18)",
  secondaryHue = "rgba(255,255,255,0.04)",
  borderColor = "rgba(255,255,255,0.06)",
  globalMouseX = 0,
  globalMouseY = 0,
  isWithinRange = false,
}: InternalCursorCardProps) {
  const elementRef = useRef<HTMLDivElement>(null)
  const { localMouseX, localMouseY, isCardActive } = useCardActivation(
    elementRef,
    globalMouseX,
    globalMouseY,
    isWithinRange,
    illuminationRadius
  )

  const gradientBackground = useMotionTemplate`
    radial-gradient(${illuminationRadius}px circle at ${localMouseX}px ${localMouseY}px,
    ${primaryHue},
    ${secondaryHue},
    ${borderColor} 100%
    )
  `

  const illuminationBackground = useMotionTemplate`
    radial-gradient(${illuminationRadius}px circle at ${localMouseX}px ${localMouseY}px,
    ${illuminationColor}, transparent 100%)
  `

  return (
    <div
      ref={elementRef}
      className={cn("group relative rounded-[inherit] bg-[#09090B]", className)}
    >
      {/* Animated border glow (covers full area, clips to card) */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{ background: gradientBackground }}
      />
      {/* 
        Solid background that covers the inner area, leaving exactly 1px 
        on the edges so the 'gradientBackground' acts like a border.
        Using top: 1px, bottom: 1px, left: 1px, right: 1px instead of inset-px for safety.
      */}
      <div 
        className="absolute rounded-[inherit] pointer-events-none" 
        style={{ background: "#09090B", top: "1px", bottom: "1px", left: "1px", right: "1px" }} 
      />
      {/* Illumination overlay */}
      <motion.div
        className={cn(
          "pointer-events-none absolute inset-px rounded-[inherit] transition-opacity duration-300",
          isCardActive ? "opacity-100" : "opacity-0"
        )}
        style={{
          background: illuminationBackground,
          opacity: isCardActive ? illuminationOpacity : 0,
        }}
      />
      {/* Content */}
      <div className="relative">{children}</div>
    </div>
  )
}
