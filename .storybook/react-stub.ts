// @storybook/addon-themes' main entry has a top-level `import React from 'react'`
// that is only used by `withThemeFromJSXProvider`, which we don't use. Aliasing
// react to this stub lets us avoid installing react in a Svelte-only project.
// If you ever need `withThemeFromJSXProvider`, remove the alias and add react back.
export default {};
