declare module "download-git-repo" {
  export default function download(
    url: string,
    dir: string,
    callback: (error: Error | undefined) => void
  ): Promise<any>;
}
