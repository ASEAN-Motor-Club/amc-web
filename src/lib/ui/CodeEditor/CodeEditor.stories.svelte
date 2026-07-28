<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import CodeEditor from './CodeEditor.svelte';

  const { Story } = defineMeta({
    title: 'Ui/CodeEditor',
    component: CodeEditor,
    tags: ['autodocs'],
    argTypes: {
      value: {
        control: false,
      },
      onChange: {
        control: false,
      },
      schema: {
        control: false,
      },
    },
  });

  const exampleSchema = {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1 },
      count: { type: 'number' },
    },
    required: ['name', 'count'],
    additionalProperties: false,
  };

  let value = $state(JSON.stringify({ name: 'example', count: 2 }, null, 2));
</script>

<Story name="Default" asChild>
  <div class="h-100">
    <CodeEditor
      {value}
      onChange={(next) => {
        value = next;
      }}
      schema={exampleSchema}
    />
  </div>
</Story>
