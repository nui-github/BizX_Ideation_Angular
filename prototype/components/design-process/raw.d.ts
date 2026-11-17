// Lets TypeScript accept `import svg from './x.svg?raw'` (Vite inlines the file as a string).
declare module '*.svg?raw' {
  const content: string;
  export default content;
}
