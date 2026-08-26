"use client"

import * as React from "react"

interface GridNode {
  x: number
  y: number
  vx: number
  vy: number
  baseX: number
  baseY: number
  radius: number
}

const SPACING = 68
const CONNECT_DIST = 90
const CONNECT_DIST_SQ = CONNECT_DIST * CONNECT_DIST
const MOUSE_RADIUS = 180
const SPRING_K = 18
const DAMPING = 0.82

/** Ambient interactive node mesh for the hero background. Fills its positioned parent. */
export function ConstellationGrid() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)

  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const canvas = canvasRef.current
    const container = canvas?.parentElement
    if (!canvas || !container) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let width = 0
    let height = 0
    let nodes: GridNode[] = []
    let animationFrameId = 0
    let running = true
    let lastTime = performance.now()

    const mouse = { x: -1000, y: -1000 }

    const initNodes = () => {
      nodes = []
      const cols = Math.ceil(width / SPACING) + 1
      const rows = Math.ceil(height / SPACING) + 1
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = i * SPACING
          const y = j * SPACING
          nodes.push({
            x,
            y,
            vx: 0,
            vy: 0,
            baseX: x,
            baseY: y,
            radius: Math.random() * 1 + 1,
          })
        }
      }
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const rect = container.getBoundingClientRect()
      width = rect.width
      height = rect.height
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      initNodes()
    }

    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect()
      mouse.x = e.clientX - rect.left
      mouse.y = e.clientY - rect.top
    }

    const handlePointerLeave = () => {
      mouse.x = -1000
      mouse.y = -1000
    }

    const render = (now: number) => {
      if (!running) return
      const dt = Math.min((now - lastTime) / 1000, 0.05)
      lastTime = now

      ctx.clearRect(0, 0, width, height)

      for (const n of nodes) {
        const dx = mouse.x - n.x
        const dy = mouse.y - n.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < MOUSE_RADIUS && dist > 0) {
          const power = 1 - dist / MOUSE_RADIUS
          const force = power * 900
          const angle = Math.atan2(dy, dx)
          n.vx -= Math.cos(angle) * force * dt
          n.vy -= Math.sin(angle) * force * dt
        }

        n.vx += (n.baseX - n.x) * SPRING_K * dt
        n.vy += (n.baseY - n.y) * SPRING_K * dt
        n.vx *= DAMPING
        n.vy *= DAMPING
        n.x += n.vx * dt * 60
        n.y += n.vy * dt * 60
      }

      ctx.lineWidth = 0.6
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i]
        if (!n) continue
        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j]
          if (!n2) continue
          const ndx = n.x - n2.x
          const ndy = n.y - n2.y
          const distSq = ndx * ndx + ndy * ndy
          if (distSq < CONNECT_DIST_SQ) {
            const alpha = (1 - Math.sqrt(distSq) / CONNECT_DIST) * 0.12
            ctx.strokeStyle = `oklch(1 0 0 / ${alpha})`
            ctx.beginPath()
            ctx.moveTo(n.x, n.y)
            ctx.lineTo(n2.x, n2.y)
            ctx.stroke()
          }
        }
      }

      for (const n of nodes) {
        const dx = mouse.x - n.x
        const dy = mouse.y - n.y
        const isNear = Math.sqrt(dx * dx + dy * dy) < MOUSE_RADIUS
        ctx.fillStyle = isNear
          ? "oklch(0.68 0.105 245 / 90%)"
          : "oklch(1 0 0 / 18%)"
        ctx.beginPath()
        ctx.arc(n.x, n.y, isNear ? n.radius * 1.8 : n.radius, 0, Math.PI * 2)
        ctx.fill()
      }

      animationFrameId = requestAnimationFrame(render)
    }

    resize()
    animationFrameId = requestAnimationFrame(render)

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(container)

    window.addEventListener("pointermove", handlePointerMove, { passive: true })
    window.addEventListener("pointerleave", handlePointerLeave)

    const visibilityObserver = new IntersectionObserver(([entry]) => {
      running = entry?.isIntersecting ?? false
      if (running) {
        lastTime = performance.now()
        animationFrameId = requestAnimationFrame(render)
      }
    })
    visibilityObserver.observe(container)

    return () => {
      running = false
      cancelAnimationFrame(animationFrameId)
      resizeObserver.disconnect()
      visibilityObserver.disconnect()
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerleave", handlePointerLeave)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
    />
  )
}
