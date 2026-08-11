<script lang="ts">
  import Select from './Select.svelte';
  import SelectOption from './SelectOption.svelte';

  let { onChange } = $props<{ onChange?: (id: string) => void }>();

  let value = $state('');

  const handleChange = (id: string) => {
    value = id;
    onChange?.(id);
  };
</script>

<Select {value} name="pick" placeholder="Pick one" onChange={handleChange}>
  <SelectOption id="a" value="Option A" />
  <SelectOption id="b" value="Option B" />
</Select>
