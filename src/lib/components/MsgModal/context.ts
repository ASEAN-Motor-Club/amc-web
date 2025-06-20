import { getContext, setContext } from 'svelte';

const key = {};

export type ModalParams = {
  title: string;
  message: string;
  confirmAction?: () => void;
  cancelAction?: () => void;
  confirmText?: string;
  cancelText?: string;
};

export type MsgModalContext = {
  showModal: (params: ModalParams) => void;
  hideModal: () => void;
  readonly isOpen: boolean;
};

export function setMsgModalContext(msgModal: MsgModalContext) {
  setContext(key, msgModal);
}

export function getMsgModalContext() {
  const context = getContext(key);
  if (context === undefined) {
    throw new Error('MsgModal context not found. Make sure to set it before using.');
  }
  return context as MsgModalContext;
}
