<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Button from './Button.svelte';
  import Icon from '../Icon/Icon.svelte';

  const { Story } = defineMeta({
    title: 'Ui/Button',
    component: Button,
    tags: ['autodocs'],
    argTypes: {
      color: {
        control: { type: 'select' },
      },
      variant: {
        control: { type: 'select' },
      },
      size: {
        control: { type: 'select' },
      },
      type: {
        control: { type: 'select' },
      },
      onClick: {
        control: false,
      },
      class: {
        control: {
          type: 'text',
        },
      },
      children: {
        control: false,
      },
    },
  });
</script>

<Story name="Default">Button</Story>

<Story name="All Colors">
  {#snippet template({ children: _, ...args })}
    <div class="flex flex-wrap gap-2">
      <Button {...args} color="primary">Primary</Button>
      <Button {...args} color="secondary">Secondary</Button>
      <Button {...args} color="info">Info</Button>
      <Button {...args} color="success">Success</Button>
      <Button {...args} color="warning">Warning</Button>
      <Button {...args} color="error">Error</Button>
      <Button {...args} color="neutral">Neutral</Button>
    </div>
  {/snippet}
</Story>

<Story name="Icon">
  {#snippet template({ children: _, icon: __, ...args })}
    <div class="flex flex-wrap gap-2">
      <Button {...args} icon color="primary">
        <Icon class="i-material-symbols:home-outline-rounded" size="md" />
      </Button>
      <Button {...args} icon color="secondary">
        <Icon class="i-material-symbols:factory-outline-rounded" size="md" />
      </Button>
      <Button {...args} icon color="info">
        <Icon class="i-material-symbols:radio-outline-rounded" size="md" />
      </Button>
      <Button {...args} icon color="success">
        <Icon class="i-material-symbols:map-outline-rounded" size="md" />
      </Button>
      <Button {...args} icon color="warning">
        <Icon class="i-material-symbols:route-outline" size="md" />
      </Button>
      <Button {...args} icon color="error">
        <Icon class="i-material-symbols:link-rounded" size="md" />
      </Button>
      <Button {...args} icon color="neutral">
        <Icon class="i-material-symbols:dashboard-outline" size="md" />
      </Button>
    </div>
  {/snippet}
</Story>

<Story name="Append Icon">
  {#snippet template({ children: _, icon: __, size: ___, ...args })}
    <div class="flex flex-wrap gap-2">
      <Button {...args} size="xs">
        {#snippet prependIcon()}
          <Icon class="i-material-symbols:pause-rounded" />
        {/snippet}
        Pause
      </Button>
      <Button {...args} size="sm">
        {#snippet prependIcon()}
          <Icon class="i-material-symbols:pause-rounded" />
        {/snippet}
        Pause
      </Button>
      <Button {...args} size="md">
        {#snippet prependIcon()}
          <Icon class="i-material-symbols:pause-rounded" />
        {/snippet}
        Pause
      </Button>
      <Button {...args} size="lg">
        {#snippet prependIcon()}
          <Icon class="i-material-symbols:pause-rounded" />
        {/snippet}
        Pause
      </Button>
    </div>
  {/snippet}
</Story>
