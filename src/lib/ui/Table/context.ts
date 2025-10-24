import { createContext } from 'svelte';

interface TableContext {
  gridClass: string;
  rowClass: string;
}

const [getTableContext, setTableContext] = createContext<TableContext>();

export { getTableContext, setTableContext };
