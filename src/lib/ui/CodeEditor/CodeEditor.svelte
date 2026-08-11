<script lang="ts">
  import clsx from 'clsx';
  import { onMount } from 'svelte';
  import type { ClassValue } from 'svelte/elements';
  import { twMerge } from 'tailwind-merge';
  import type * as Monaco from 'monaco-editor';
  import { monaco, jsonDefaults, LIGHT_THEME, DARK_THEME } from './monaco';

  export interface CodeEditorProps {
    /**
     * The text to edit
     */
    value: string;
    /**
     * Called with the full text whenever the user edits it
     */
    onChange: (value: string) => void;
    /**
     * JSON Schema used for completion and inline diagnostics
     */
    schema?: object;
    /**
     * CSS class to apply to the code editor component
     */
    class?: ClassValue;
  }

  const { value, onChange, schema, class: propsClass }: CodeEditorProps = $props();

  const SCHEMA_URI = 'inmemory://schema/code-editor.json';
  const EDITOR_TAB_SIZE = 2;

  let container: HTMLDivElement;
  let editor = $state<Monaco.editor.IStandaloneCodeEditor | undefined>(undefined);
  /** Suppresses the change callback while a `value` prop update is being written into the model */
  let applyingExternalValue = false;

  const isDarkMode = () => document.documentElement.classList.contains('dark');
  const currentTheme = () => (isDarkMode() ? DARK_THEME : LIGHT_THEME);

  onMount(() => {
    // Diagnostics options are global, so the schema is bound to this instance's model by uri.
    const modelUri = monaco.Uri.parse(`inmemory://code-editor/${crypto.randomUUID()}.json`);
    jsonDefaults.setDiagnosticsOptions({
      validate: true,
      allowComments: false,
      enableSchemaRequest: false,
      trailingCommas: 'error',
      // Defaults to 'warning', but here a schema violation is what blocks saving.
      schemaValidation: 'error',
      schemas: schema ? [{ uri: SCHEMA_URI, fileMatch: [modelUri.toString()], schema }] : undefined,
    });

    const model = monaco.editor.createModel(value, 'json', modelUri);
    const createdEditor = monaco.editor.create(container, {
      model,
      automaticLayout: true,
      theme: currentTheme(),
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      // Keeps completion to what the schema describes instead of words already in the document.
      wordBasedSuggestions: 'off',
      tabSize: EDITOR_TAB_SIZE,
      padding: { top: 12, bottom: 12 },
    });
    editor = createdEditor;

    const contentSubscription = model.onDidChangeContent(() => {
      if (applyingExternalValue) {
        return;
      }
      onChange(model.getValue());
    });

    // Monaco's theme is global and this app toggles dark mode with a class on <html>.
    const themeObserver = new MutationObserver(() => {
      monaco.editor.setTheme(currentTheme());
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    // Ancestors can still be laid out after this child mounts, so the first measurement is stale.
    const layoutFrame = requestAnimationFrame(() => {
      createdEditor.layout();
    });

    return () => {
      cancelAnimationFrame(layoutFrame);
      themeObserver.disconnect();
      contentSubscription.dispose();
      createdEditor.dispose();
      // Not covered by editor.dispose(), which only owns models it created itself.
      model.dispose();
      editor = undefined;
    };
  });

  $effect(() => {
    const nextValue = value;
    const model = editor?.getModel();
    if (!model || model.getValue() === nextValue) {
      return;
    }

    // setValue() would reset the cursor to the start and drop the undo stack.
    const selections = editor?.getSelections() ?? null;
    applyingExternalValue = true;
    try {
      model.pushEditOperations(
        selections,
        [{ range: model.getFullModelRange(), text: nextValue, forceMoveMarkers: true }],
        () => selections,
      );
    } finally {
      applyingExternalValue = false;
    }
  });
</script>

<div bind:this={container} class={twMerge('h-full w-full', clsx(propsClass))}></div>
