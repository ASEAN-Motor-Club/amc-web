declare module '@fontsource/*' {}
declare module '@fontsource-variable/*' {}
declare module '@fontsource-variable/*.css?url' {
  const src: string;
  export default src;
}
