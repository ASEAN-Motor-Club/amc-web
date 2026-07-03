declare module '@fontsource/*' {}
declare module '@fontsource-variable/*' {}
declare module '@fontsource-variable/*.css?url' {
  const src: string;
  export default src;
}

// https://developer.mozilla.org/en-US/docs/Web/API/Document_Picture-in-Picture_API
interface DocumentPictureInPictureOptions {
  width?: number;
  height?: number;
  disallowReturnToOpener?: boolean;
  preferInitialWindowPlacement?: boolean;
}

interface DocumentPictureInPictureEvent extends Event {
  readonly window: Window;
}

interface DocumentPictureInPictureEventMap {
  enter: DocumentPictureInPictureEvent;
}

interface DocumentPictureInPicture extends EventTarget {
  readonly window: Window | null;
  onenter: ((this: DocumentPictureInPicture, ev: DocumentPictureInPictureEvent) => unknown) | null;
  requestWindow: (options?: DocumentPictureInPictureOptions) => Promise<Window>;
  addEventListener: {
    <K extends keyof DocumentPictureInPictureEventMap>(
      type: K,
      listener: (
        this: DocumentPictureInPicture,
        ev: DocumentPictureInPictureEventMap[K],
      ) => unknown,
      options?: boolean | AddEventListenerOptions,
    ): void;
    (
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions,
    ): void;
  };
  removeEventListener: {
    <K extends keyof DocumentPictureInPictureEventMap>(
      type: K,
      listener: (
        this: DocumentPictureInPicture,
        ev: DocumentPictureInPictureEventMap[K],
      ) => unknown,
      options?: boolean | EventListenerOptions,
    ): void;
    (
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | EventListenerOptions,
    ): void;
  };
}

interface Window {
  readonly documentPictureInPicture?: DocumentPictureInPicture;
}
