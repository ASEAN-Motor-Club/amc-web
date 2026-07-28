// The only place Monaco may be imported from. Reaching it through a second specifier creates a
// second copy of the standalone API singleton, and only one of them gets the json contribution.
//
// `editor.all.js` is what registers the editor contributions (suggest, hover, find, codicons);
// `editor.api.js` alone renders a textarea with no widgets. Order matters: both register against
// the api singleton. Extensions are explicit because monaco 0.55+ resolves them differently.
import 'monaco-editor/esm/vs/editor/editor.all.js';
import 'monaco-editor/esm/vs/language/json/monaco.contribution.js';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker.js?worker';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker.js?worker';

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
