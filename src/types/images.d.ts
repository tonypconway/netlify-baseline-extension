declare module "*.png" {
  const value: string;
  export = value;
}

declare module "*.svg" {
  const content: string;
  export default content;
}
