<script lang="ts">
  import ClickAwayBlock from './ClickAwayBlock.svelte';

  export interface Props {
    active: boolean;
    onClickAway?: () => void;
    additionalElements?: (Element | undefined)[];
  }

  let { active, onClickAway, additionalElements = [] }: Props = $props();
</script>

<ClickAwayBlock {active} {onClickAway} {additionalElements}>
  <button id="inside">inside</button>
</ClickAwayBlock>
<button id="outside">outside</button>
