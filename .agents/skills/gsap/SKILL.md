---
name: gsap
description: Animation guidance for the AMC web repo — when to use GSAP vs CSS/Svelte transitions. Read before adding animations.
---

# GSAP

- GSAP is reserved for **timeline-style choreography** — multi-step, scripted animation sequences (see `src/routes/championship/+page.svelte`).
- Simple transitions should use CSS/UnoCSS classes or Svelte's built-in transitions instead — don't pull GSAP into a component for a fade or slide.
- Respect reduced motion: check `prefersReducedMotion` from `svelte/motion` before running decorative animations (the map wrapper already does this — follow that pattern).
- Use `$lib/tw-var`'s `defaultTransitionDurationMs` (and `cssTransitionToMs` from `src/lib/utils/`) to keep JS-driven timing consistent with CSS.

Related: [[codebase-patterns]], [[lottie]]
