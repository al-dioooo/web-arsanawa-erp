---
name: motion
description: Motion animation library expertise for React, JavaScript, and Vue. Use when the user asks about animation, motion, framer-motion, transitions, spring animations, gesture animations, layout animations, scroll animations, or SVG animations.
---

# Motion Animation Library

This skill provides best practices and guidance for using the [Motion](https://motion.dev) animation library.

## Import

Motion v12 is already installed in this project as `"motion": "^12.40.0"`.

```tsx
import { motion, AnimatePresence } from "motion"
```

## Key Principles

### 1. motion components are the core building block
- Every HTML and SVG element has a `motion.` counterpart: `motion.div`, `motion.button`, `motion.path`, etc.
- These are normal DOM elements enhanced with animation capabilities.
- In React with Server Components, use `motion` inside client components (`"use client"`).

### 2. Prefer declarative props over imperative APIs
- Use `initial`, `animate`, `exit`, `whileHover`, `whilePress`, `whileFocus`, `whileInView`, `whileDrag` props.
- Reserve `useAnimate()` for complex sequences and imperative control.
- Reserve `useMotionValue()` + `useTransform()` for high-performance reactive values.

### 3. Let Motion choose the default transition type
- Physical properties (`x`, `y`, `scale`, `rotate`) animate with spring physics by default.
- Visual properties (`opacity`, `color`, `backgroundColor`) animate with duration-based easing by default.
- Override via the `transition` prop only when defaults don't produce the desired feel.

### 4. Performance: prefer transform properties
- `transform` properties (`x`, `y`, `scale`, `rotate`) are GPU-accelerated and don't trigger layout/reflow.
- Avoid animating `width`, `height`, `top`, `left`, `right`, `bottom`, `margin`, `padding` directly.
- For size/layout changes, use the `layout` prop which performs layout animations via transforms.
- Motion's hybrid engine can hardware-accelerate `transform` animations.

### 5. Use variants for orchestration
- Variants flow down through the motion component tree.
- Use `when`, `delayChildren`, `staggerChildren`, `staggerDirection` in variant transitions.
- Dynamic variants accept `custom` prop for index-based delays.

## Patterns

### Basic enter animation
```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
/>
```

### Gesture animations
```tsx
<motion.button
  whileHover={{ scale: 1.05 }}
  whilePress={{ scale: 0.95 }}
  transition={{ type: "spring", bounce: 0.2 }}
/>
```

### Layout animation
```tsx
<motion.div layout transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />
```

### Shared element transitions
```tsx
{isSelected && <motion.div layoutId="highlight" />}
```

### Exit animations (AnimatePresence)
```tsx
<AnimatePresence>
  {isVisible && (
    <motion.div
      key="modal"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
    />
  )}
</AnimatePresence>
```

### Scroll-triggered animation
```tsx
<motion.div
  initial={{ opacity: 0 }}
  whileInView={{ opacity: 1 }}
  viewport={{ once: true, margin: "-50px" }}
/>
```

### Scroll-linked animation
```tsx
import { useScroll, useTransform } from "motion"

function Component() {
  const { scrollYProgress } = useScroll()
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1])
  return <motion.div style={{ scaleX }} />
}
```

### Stagger children with variants
```tsx
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.3 },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

<motion.ul variants={container} initial="hidden" animate="show">
  {items.map(i => (
    <motion.li key={i} variants={item} />
  ))}
</motion.ul>
```

### Keyframes
```tsx
<motion.div
  animate={{ x: [0, 100, 50, 0] }}
  transition={{ duration: 2, repeat: Infinity }}
/>
```

### MotionValue for reactive state
```tsx
import { useMotionValue, useSpring, useTransform } from "motion"

function Component() {
  const x = useMotionValue(0)
  const springX = useSpring(x, { bounce: 0.1 })
  const color = useTransform(x, [-100, 0, 100], ["#ff0000", "#ffffff", "#00ff00"])
  return <motion.div style={{ x: springX, backgroundColor: color }} />
}
```

### Drag
```tsx
<motion.div
  drag="x"
  dragConstraints={{ left: 0, right: 300 }}
  dragElastic={0.2}
  whileDrag={{ scale: 1.1 }}
/>
```

## CSS Spring Generation

For CSS animations without Motion:
- Use `generate-css-spring` tool with `bounce` (0-1) and `duration` (seconds) parameters.
- The generated `linear()` easing function can be used in CSS `transition` or `animation` properties.
- Quick/snappy: ~0.2s duration | Normal: 0.3-0.4s | Slow: ~1s.

## Transition Types

| Type | When to use |
|------|-------------|
| `spring` | Physical motion, gestures, natural feel |
| `tween` | UI transitions, precise timing |
| `inertia` | Momentum-based deceleration (drag) |
| `keyframes` | Multi-step sequential animations |

## Accessibility
- Use `useReducedMotion()` to respect user preferences:
  ```tsx
  import { useReducedMotion } from "motion"
  const shouldReduceMotion = useReducedMotion()
  ```
- Disable enter animations by setting `initial={false}`.
