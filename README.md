# AMC Web

Website for ASEAN Motor Club

## 🛠️ Tech Stack

- **Framework**: [Svelte](https://svelte.dev/) with [SvelteKit](https://kit.svelte.dev/) using [Static Adapter](https://kit.svelte.dev/docs/adapter-static)
- **Styling**: [UnoCSS](https://unocss.dev/) with [Wind4 preset (Tailwind CSS v4.0 syntax)](https://unocss.dev/presets/wind4)
- **Icons**: [Material Symbols](https://fonts.google.com/icons?icon.style=Rounded) (Rounded pack)
- **Testing**: [Vitest](https://vitest.dev/) with [@testing-library/svelte](https://testing-library.com/docs/svelte-testing-library/intro/)
- **Internationalization**: [Paraglide](https://inlang.com/paraglide)
- **Component Development**: [Storybook](https://storybook.js.org/)
- **Code Quality**: [ESLint](https://eslint.org/) and [Prettier](https://prettier.io/)
- **Type Safety**: [TypeScript](https://www.typescriptlang.org/)

## 🚀 Prerequisites

- **Node.js**: LTS version recommended
- **VS Code Extensions** (highly recommended):
  - [Svelte for VS Code](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode)
  - [UnoCSS](https://marketplace.visualstudio.com/items?itemName=antfu.unocss) ([Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss) should work too)
  - [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
  - [Prettier - Code formatter](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
  - [Vitest](https://marketplace.visualstudio.com/items?itemName=vitest.explorer)
  - [Sherlock](https://marketplace.visualstudio.com/items?itemName=inlang.vs-code-extension) (for i18n from Paraglide)

## ⚙️ VS Code Configuration

Add the following to your VS Code `settings.json` for proper ESLint support in Svelte files:

```json
{
  "eslint.validate": ["javascript", "javascriptreact", "svelte"]
}
```

## 🏁 Getting Started

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd amc-web
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start development server**

   ```bash
   npm run dev
   ```

   Your app will be available at `http://localhost:5173`

4. **Start Storybook** (for UI component development)
   ```bash
   npm run storybook
   ```
   Storybook will be available at `http://localhost:6006`

## 📜 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run storybook` - Start Storybook for component development
- `npm run test` - Run unit tests
- `npm run test:unit` - Run unit tests in watch mode
- `npm run check` - Run type checking
- `npm run lint` - Check code formatting and linting
- `npm run format` - Format code with Prettier

## 🧪 Testing

This project uses Vitest for unit testing with Testing Library for Svelte components. Tests are located alongside components or in dedicated test files.

```bash
# Run tests once
npm run test

# Run tests in watch mode
npm run test:unit
```

## 🌍 Internationalization

This project uses **Paraglide** for internationalization. All user-facing text should be internationalized.

- Translation files are located in the `messages/` directory
- Use the Paraglide runtime for accessing translations in components
- The Sherlock VS Code extension is recommended

Example usage:

```svelte
<script lang="ts">
  import * as m from '$lib/paraglide/messages.js';
</script>

<h1>{m.hello_world()}</h1>
```

## 🧩 Component Development

Components are developed using Storybook for isolated development and documentation:

- Components are located in `src/lib/ui/`
- Each component includes a `.stories.svelte` file for Storybook
- Run `npm run storybook` to develop and test components in isolation

## 🔣 Using Icons

The project includes an `<Icon />` component that uses **Material Symbols Rounded** icons:

```svelte
<script>
  import { Icon } from '$lib/ui/Icon/Icon.svelte';
</script>

<Icon icon="favorite" />
<Icon icon="home" />
<Icon icon="settings" />
```

**Important**: When using a new icon, you must add it to the `iconList` constant in `src/hooks.server.ts`:

```diff
const iconList = [
   // add imported icons here
+  'favorite',
+  'home',
+  'settings',
];
```

This ensures the icon fonts are loaded efficiently by only including the icons your app actually uses.

## 🎨 Styling Details

This project uses **UnoCSS** with the **Wind4 preset**, which mimics the syntax and utility classes of Tailwind CSS v4.0. Styling is applied using the [UnoCSS Svelte Scoped integration](https://unocss.dev/integrations/svelte-scoped), which provides per-component style scoping for Svelte files.

**Limitations:**

- All utility classes must be specified in one of the following:
  - The `class` attribute or props `<div class="mb-1" />`, `<div class={["mt-1", { 'mb-1': condition, flex }]} />`
  - The `class:` directive `<div class:mb-1={condition} />`, `<div class:flex />`
- Dynamic or computed class names that cannot be statically analyzed by UnoCSS will not be processed.
- You cannot define utility classes as variables in the `<script>` block and use them in markup. UnoCSS requires all classes to be statically present in the markup for detection and processing.

  **Example (not supported):**

  ```svelte
  <script>
    const btnClass = 'bg-red-500 text-white px-4 py-2 rounded';
  </script>

  <button class={btnClass}>Click me</button>
  ```

  Instead, always write utility classes directly in the markup:

  ```svelte
  <button class="rounded bg-red-500 px-4 py-2 text-white">Click me</button>
  ```

Refer to the [UnoCSS documentation](https://unocss.dev/integrations/svelte-scoped) for more details and best practices.

## 🤝 Collaboration Guidelines

Before merging any pull request, ensure that:

### ✅ CI Requirements (Must Pass)

1. **Code Formatting**: Code is properly formatted with Prettier
2. **Type Check**: TypeScript compilation passes without errors
3. **Unit Tests**: All unit tests pass
4. **Linting**: ESLint checks pass without errors

### 💡 Best Practices

- **Unit Testing**: Writing unit tests is encouraged and appreciated
- **Internationalization**: Use Paraglide for all user-facing text
- **Component Stories**: Add Storybook stories for new reusable UI components
- **Type Safety**: Leverage TypeScript for better developer experience
- **Styling**: Prefer Tailwind CSS utility classes for styling components

### 🔧 Pre-commit Checklist

Run these commands before committing:

```bash
npm run format  # Format code
npm run lint    # Check linting
npm run check   # Type checking
npm run test    # Run tests
```

## 🔧 Development Tools

- **ESLint**: Configured for Svelte, TypeScript, and Storybook
- **Prettier**: Automatic code formatting with Svelte and Tailwind plugins
- **TypeScript**: Full type safety across the project
- **Vitest**: Fast unit testing with jsdom environment
- **Storybook**: Component development and documentation

---

Happy coding! 🚀
