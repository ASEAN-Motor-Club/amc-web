// The only place Monaco may be imported from. Reaching it through a second specifier creates a
// second copy of the standalone API singleton, and only one of them gets the json contribution.
//
// `editor.main.js` is what registers the editor contributions (suggest, hover, find, codicons)
// plus the basic language definitions; `editor.api.js` alone renders a textarea with no widgets.
// Order matters: both register against the api singleton. Extensions are explicit because
// monaco 0.55+ resolves them differently.
//
// Since monaco 0.56 the package exports map prepends `esm/vs/` itself, so specifiers must NOT
// include the prefix (`editor/…` not `esm/vs/editor/…`). `jsonDefaults` moved out of
// `monaco.languages.json` (now a deprecated stub) into the json feature register; it is
// re-exported here so components never import monaco internals directly.
import 'monaco-editor/editor/editor.main.js';
import 'monaco-editor/language/json/monaco.contribution.js';
import * as monaco from 'monaco-editor/editor/editor.api.js';
import EditorWorker from 'monaco-editor/editor/editor.worker.js?worker';
import JsonWorker from 'monaco-editor/language/json/json.worker.js?worker';

export { jsonDefaults } from 'monaco-editor/languages/features/json/register.js';

const JSON_WORKER_LABEL = 'json';

// Monaco reads this off the global at worker creation time, which is lazy — assigning it at module
// scope is early enough as long as callers await this module before creating an editor.
self.MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    // The editor worker service is spawned even for a plain json model (word based suggestions,
    // link detection), so it is the fallback rather than an unreachable branch.
    return label === JSON_WORKER_LABEL ? new JsonWorker() : new EditorWorker();
  },
};

export const LIGHT_THEME = 'vs';
export const DARK_THEME = 'vs-dark';

export { monaco };
