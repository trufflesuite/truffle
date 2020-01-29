declare module "github-download" {
  interface GhDownloadEvent<T> {
    on(handler: string, resp: { (resp?: Promise<any>): void }): any;
  }
  export default function ghdownload(
    url: string,
    dir: string
  ): GhDownloadEvent<any>;
}
