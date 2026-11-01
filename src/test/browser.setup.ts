// Browser (comp) project setup: the root layout owns the global style imports, but
// integration tests render pages without the layout. Mirror those imports here so
// tested pages are styled the way they are in the app (fonts, Tailwind via app.css).
import '@fontsource-variable/noto-sans';
import '../app.css';

// Kit 3's dev `$app/env/public` destructures `env` from this global, which only the Kit dev
// server injects into the page. Every public var is `static` (inlined), so it can stay empty.
Object.assign(globalThis, { __sveltekit_dev: { env: {} } });
