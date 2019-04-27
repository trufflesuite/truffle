import axios, { AxiosResponse } from 'axios'

export interface Imported {
  content: string;
  cleanURL: string;
  type: string;
}

interface PreviouslyHandledImports {
  [filePath: string]: Imported
}

interface Handler {
  type: string;
  match(url: string): any;
  handle(match: any): any;
}

export class TruffleURLResolver {
  private previouslyHandled: PreviouslyHandledImports
  constructor() {
    this.previouslyHandled = {}
  }
  /**
  * Handle an import statement based on github
  * @params root The root of the github import statement
  * @params filePath path of the file in github
  */
  async handleGithubCall(root: string, filePath: string) {
    try {
      let req: string = 'https://api.github.com/repos/' + root + '/contents/' + filePath
      const response: AxiosResponse = await axios.get(req)
      return Buffer.from(response.data.content, 'base64').toString()
    } catch(e) {
      throw e
    }
  }
  /**
  * Handle an import statement based on http
  * @params url The url of the import statement
  * @params cleanURL
  */
  async handleHttp(url: string, _: string) {
    try {
      const response: AxiosResponse = await axios.get(url)
      return response.data
    } catch(e) {
      throw e
    }
  }
  /**
  * Handle an import statement based on https
  * @params url The url of the import statement
  * @params cleanURL
  */
  async handleHttps(url: string, _: string) {
    try {
      const response: AxiosResponse = await axios.get(url)
      return response.data
    } catch(e) {
      throw e
    }
  }
  handleSwarm(url: string, cleanURL: string) {
    return
  }
  /**
  * Handle an import statement based on IPFS
  * @params url The url of the IPFS import statement
  */
  async handleIPFS(url: string) {
    // replace ipfs:// with /ipfs/
    url = url.replace(/^ipfs:\/\/?/, 'ipfs/')
    try {
      const req = 'https://gateway.ipfs.io/' + url
      // If you don't find greeter.sol on ipfs gateway use local
      // const req = 'http://localhost:8080/' + url
      const response: AxiosResponse = await axios.get(req)
      return response.data
    } catch (e) {
      throw e
    }
  }
  getHandlers(): Handler[] {
    return [
      {
        type: 'github',
        match: (url) => { return /^(https?:\/\/)?(www.)?github.com\/([^/]*\/[^/]*)\/(.*)/.exec(url) },
        handle: (match) => this.handleGithubCall(match[3], match[4])
      },
      {
        type: 'http',
        match: (url) => { return /^(http?:\/\/?(.*))$/.exec(url) },
        handle: (match) => this.handleHttp(match[1], match[2])
      },
      {
        type: 'https',
        match: (url) => { return /^(https?:\/\/?(.*))$/.exec(url) },
        handle: (match) => this.handleHttps(match[1], match[2])
      },
      {
        type: 'swarm',
        match: (url) => { return /^(bzz-raw?:\/\/?(.*))$/.exec(url) },
        handle: (match) => this.handleSwarm(match[1], match[2])
      },
      {
        type: 'ipfs',
        match: (url) => { return /^(ipfs:\/\/?.+)/.exec(url) },
        handle: (match) => this.handleIPFS(match[1])
      }
    ]
  }

  public async resolve(filePath: string, customHandlers?: Handler[]): Promise<Imported> {
    var imported: Imported = this.previouslyHandled[filePath]
    if(imported) {
      return imported
    }
    const builtinHandlers: Handler[] = this.getHandlers()
    const handlers: Handler[] = customHandlers ? [...builtinHandlers, ...customHandlers] : [...builtinHandlers]
    const matchedHandler = handlers.filter(handler => handler.match(filePath))
    const handler: Handler = matchedHandler[0]
    const match = handler.match(filePath)
    const content: string = await handler.handle(match)
    imported = {
      content,
      cleanURL: filePath,
      type: handler.type
    }
    this.previouslyHandled[filePath] = imported
    return imported
  }
}