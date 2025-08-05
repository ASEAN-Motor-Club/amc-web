# AMC Web

Website for ASEAN Motor Club

## 🛠️ Tech Stack

- **Framework**: [Svelte](https://svelte.dev/) with [SvelteKit](https://kit.svelte.dev/) using [Static Adapter](https://kit.svelte.dev/docs/adapter-static)
- **Styling**: [UnoCSS](https://unocss.dev/) with [Wind4 preset (Tailwind CSS v4.0 syntax)](https://unocss.dev/presets/wind4)
- **Icons**: [UnoCSS Icons preset](https://unocss.dev/presets/icons) with [Iconify Material Symbols](https://icon-sets.iconify.design/material-symbols/)
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

## 🔧 Development Tools

- **ESLint**: Configured for Svelte, TypeScript, and Storybook
- **Prettier**: Automatic code formatting with Svelte and Tailwind plugins
- **TypeScript**: Full type safety across the project
- **Vitest**: Fast unit testing with jsdom environment
- **Storybook**: Component development and documentation

## 🌍 Internationalization

This project uses **Paraglide** for internationalization. All user-facing text should be internationalized.

- Translation files are located in the `messages/` directory
- Use the Paraglide runtime for accessing translations in components
- The Sherlock VS Code extension is recommended

Example usage:

```svelte
<script lang="ts">
  import { m as msg } from '$lib/paraglide/messages';
</script>

<h1>{msg.site_name()}</h1>
```

**Important**: The import must be renamed from `m` to `msg` to prevent UnoCSS from interpreting it as a margin utility class during static analysis.

## 🎨 Styling

This project uses **UnoCSS** with the **Wind4 preset**, which mimics the syntax and utility classes of Tailwind CSS v4.0.

### UnoCSS vs Tailwind CSS Compatibility

While UnoCSS with the Wind4 preset aims to match Tailwind CSS syntax as closely as possible, **some Tailwind CSS classes might not work** in UnoCSS. This can happen because:

- UnoCSS may not have implemented certain Tailwind utilities yet
- There might be slight differences in class naming or behavior
- Custom Tailwind plugins or configurations may not be available in UnoCSS

If you find classes that should work but aren't being processed, check the [UnoCSS documentation](https://unocss.dev/) for alternatives or configuration options.

## 🔣 Using Icons

This project uses the **UnoCSS Icons preset** with [Iconify Material Symbols](https://icon-sets.iconify.design/material-symbols/).

- **Prefer the rounded version** of icons if available (e.g., `-rounded` suffix)
- Use the `<Icon />` component for standard icon usage:

  ```svelte
  <Icon class="i-material-symbols:favorite-outline-rounded" size="sm" />
  ```

  - The `class` attribute specifies the icon (using UnoCSS icon utility)
  - The `size` prop sets the icon size (`xs`, `sm`, `md`, `lg`)

Refer to the [UnoCSS Icons documentation](https://unocss.dev/presets/icons) and [Material Symbols](https://icon-sets.iconify.design/material-symbols/) for available icons and usage details.

## 🧪 Testing

This project uses Vitest for unit testing with Testing Library for Svelte components. Tests are located alongside components or in dedicated test files.

```bash
# Run tests once
npm run test

# Run tests in watch mode
npm run test:unit
```

## 🧩 Component Development

Components are developed using Storybook for isolated development and documentation:

- Components are located in `src/lib/ui/`
- Each component includes a `.stories.svelte` file for Storybook
- Run `npm run storybook` to develop and test components in isolation

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
# or
npm run checklist
```

---

Happy coding! 🚀
