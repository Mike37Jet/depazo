export type ShareOutcome = "shared" | "copied" | "dismissed" | "unavailable";

export interface SharedLink {
  title: string;
  text: string;
  path: string;
}

export interface ShareGateway {
  share(link: SharedLink): Promise<ShareOutcome>;
}
