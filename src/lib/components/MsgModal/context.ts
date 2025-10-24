import { createContext } from 'svelte';

export interface ModalParams {
  title: string;
  message: string;
  confirmAction?: () => void;
  cancelAction?: () => void;
  confirmText?: string;
  cancelText?: string;
}

export interface MsgModalContext {
  showModal: (params: ModalParams) => void;
  hideModal: () => void;
  readonly isOpen: boolean;
}

const [getMsgModalContext, setMsgModalContext] = createContext<MsgModalContext>();
export { getMsgModalContext, setMsgModalContext };
