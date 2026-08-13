// Browser (comp) project setup: the root layout owns the global style imports, but
// integration tests render pages without the layout. Mirror those imports here so
// tested pages are styled the way they are in the app (fonts, UnoCSS utilities, app.css).
import '@fontsource-variable/noto-sans';
import 'virtual:uno.css';
import '../app.css';
