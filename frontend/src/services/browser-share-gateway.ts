import type { SharedLink, ShareGateway, ShareOutcome } from "./share-gateway";

export class BrowserShareGateway implements ShareGateway {
  async share(link: SharedLink): Promise<ShareOutcome> {
    const url = new URL(link.path, window.location.origin).href;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: link.title, text: link.text, url });
        return "shared";
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return "dismissed";
        }
      }
    }
    return copyToClipboard(`${link.text} ${url}`);
  }
}

async function copyToClipboard(text: string): Promise<ShareOutcome> {
  if (typeof navigator.clipboard?.writeText !== "function") {
    return "unavailable";
  }
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch (error) {
    console.warn("shared search could not be copied", error);
    return "unavailable";
  }
}
