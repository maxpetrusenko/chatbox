declare module 'adm-zip' {
  interface AdmZipEntry {
    entryName: string
    getData(): Buffer
  }

  export default class AdmZip {
    constructor(input?: string | Buffer)
    addFile(entryName: string, content: Buffer): void
    getEntry(entryName: string): AdmZipEntry | null
    getEntries(): AdmZipEntry[]
    readAsText(entryName: string): string
    toBuffer(): Buffer
  }
}
