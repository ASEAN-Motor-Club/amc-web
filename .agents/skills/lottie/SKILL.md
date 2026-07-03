---
name: lottie
description: Lottie animation usage in the AMC web repo — render through the Lottie UI component, store animation JSONs in src/lib/assets/lottie. Read before adding vector animations.
---

# lottie-web

- Render Lottie animations through the wrapper component `src/lib/ui/Lottie/` — never import `lottie-web` directly in feature code.
- Animation JSON files live in `src/lib/assets/lottie/`.
- Lottie is for pre-authored vector animations (illustrations, loaders); for scripted UI motion use CSS/Svelte transitions or GSAP (see [[gsap]]).

Related: [[gsap]], [[project-structure]]
