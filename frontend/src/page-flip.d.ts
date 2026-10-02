declare module 'page-flip' {
  export class PageFlip {
    constructor(element: HTMLElement, settings: Record<string, unknown>)
    loadFromHTML(items: HTMLElement[]): void
    on(event: string, cb: (e: { data: unknown }) => void): PageFlip
    flipNext(corner?: string): void
    flipPrev(corner?: string): void
    destroy(): void
  }
}
