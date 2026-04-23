# AMC Web

Website for ASEAN Motor Club

## 🛠️ Tech Stack

- **Framework**: [Svelte](https://svelte.dev/) with [SvelteKit](https://kit.svelte.dev/) using [Static Adapter](https://kit.svelte.dev/docs/adapter-static)
- **Package Manager**: [pnpm](https://pnpm.io/) for fast, disk space efficient dependency management
- **Styling**: [UnoCSS](https://unocss.dev/) with [Wind4 preset (Tailwind CSS v4.0 syntax)](https://unocss.dev/presets/wind4)
- **Icons**: [UnoCSS Icons preset](https://unocss.dev/presets/icons) with [Iconify Material Symbols](https://icon-sets.iconify.design/material-symbols/)
- **Testing**: [Vitest](https://vitest.dev/) with [WebdriverIO](https://webdriver.io/) browser provider for component testing
- **Internationalization**: [Paraglide](https://inlang.com/paraglide)
- **Component Development**: [Storybook](https://storybook.js.org/)
- **Code Quality**: [ESLint](https://eslint.org/) and [Prettier](https://prettier.io/)
- **Type Safety**: [TypeScript](https://www.typescriptlang.org/)

## 🚀 Prerequisites

- **Node.js**: LTS version recommended, download [here](https://nodejs.org/en/download/current)
- **pnpm**: This project uses [pnpm](https://pnpm.io/) as the package manager. Install it using [Corepack](https://pnpm.io/installation#using-corepack) (recommended):
  ```bash
  npm install --global corepack@latest
  corepack enable
  ```
- **Rust**: Required for building the WASM module. Install via [rustup](https://rustup.rs/)
- **wasm-pack**: Required for building the WASM module. Install via:
  ```bash
  cargo install wasm-pack
  ```
- **Clang** (macOS): Required for building the WASM module. Apple's bundled clang strips out the WebAssembly backend, so the full LLVM from Homebrew is needed instead:
  ```bash
  brew install llvm
  ```
- **VS Code Extensions** (optional, highly recommended):
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

2. **Enable pnpm** (if not already done)

   ```bash
   npm install --global corepack@latest
   corepack enable
   ```

3. **Install dependencies**

   ```bash
   pnpm install
   ```

4. **Generate protobuf types and WASM**

   ```bash
   pnpm proto:generate        # Regenerate _pb.ts files from .proto definitions
   pnpm build:pakop           # Build WASM
   pnpm build:pakop:mac       # or on macOS
   ```

5. **Start development server**

   ```bash
   pnpm dev
   ```

   Your app will be available at `http://localhost:5173`

6. **Start Storybook** (for UI component development)
   ```bash
   pnpm storybook
   ```
   Storybook will be available at `http://localhost:6006`

## 📜 Available Scripts

- `pnpm dev` - Start development server
- `pnpm dev:host` - Start development server with host access
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build locally
- `pnpm preview:host` - Preview production build with host access
- `pnpm storybook` - Start Storybook for component development
- `pnpm build:storybook` - Build Storybook for deployment
- `pnpm test` - Run all tests once
- `pnpm test:unit` - Run unit tests in watch mode
- `pnpm check` - Run type checking
- `pnpm check:watch` - Run type checking in watch mode
- `pnpm lint` - Check code formatting and linting
- `pnpm lint:fix` - Auto-fix ESLint issues
- `pnpm format` - Format code with Prettier
- `pnpm paraglide:compile` - Regenerate i18n messages
- `pnpm proto:generate` - Regenerate `_pb.ts` files from `.proto` definitions
- `pnpm build:pakop` - Build WASM module
- `pnpm build:pakop:mac` - Build WASM module (macOS)
- `pnpm checklist` - Run format, lint, paraglide:compile, check, and test

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
  import { m } from '$messages';
</script>

<h1>{m.site_name()}</h1><p>{m['radio.title']()}</p>
```

## 🎨 Styling

This project uses **UnoCSS** with the **Wind4 preset**, which mimics the syntax and utility classes of Tailwind CSS v4.0.

### UnoCSS Quirks

UnoCSS has a quirk where it can interpret text in comments and even variable names as utility classes. This can lead to unexpected or unmatched classes being generated in your CSS output.

### UnoCSS vs Tailwind CSS Compatibility

While UnoCSS with the Wind4 preset aims to match Tailwind CSS syntax as closely as possible, **some Tailwind CSS classes might not work** in UnoCSS. This can happen because:

- UnoCSS may not have implemented certain Tailwind utilities yet
- There might be slight differences in class naming or behavior
- Custom Tailwind plugins or configurations may not be available in UnoCSS

### Debugging UnoCSS Issues

For both UnoCSS quirks and compatibility issues, you can use [http://localhost:5173/\_\_unocss](http://localhost:5173/__unocss) while running the dev server to debug your styling problems. This tool helps you check for unexpected classes being generated, identify why a class isn't being applied, and find unmatched or ignored classes in your project. If you find classes that should work but aren't being processed, check the [UnoCSS documentation](https://unocss.dev/) for alternatives or configuration options.

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

This project uses **Vitest** for unit testing with **WebdriverIO** as the browser provider for testing Svelte components in a real browser environment. Tests are configured to run in two modes:

- **Component tests**: Svelte component tests that run in a Chromium browser using WebdriverIO
- **Unit tests**: Tests for utility functions and non-rendering logic that run in Node.js environment

Test files should follow these naming conventions:

- `*.svelte.test.ts` or `*.svelte.spec.ts` for component tests (run in browser)
- `*.test.ts` or `*.spec.ts` for unit tests (run in Node.js)

### Running Tests

```bash
# Run tests once
pnpm test

# Run tests in watch mode
pnpm test:unit
```

## 🧩 Component Development

Components are developed using Storybook for isolated development and documentation:

- Components are located in `src/lib/ui/`
- Each component includes a `.stories.svelte` file for Storybook
- Run `pnpm storybook` to develop and test components in isolation

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
pnpm format  # Format code
pnpm lint    # Check linting
pnpm check   # Type checking
pnpm test    # Run tests
# or
pnpm checklist
```

---

Happy coding! 🚀
