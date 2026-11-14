import type { SharedLink, ShareGateway, ShareOutcome } from "../services/share-gateway";

export class FakeShareGateway implements ShareGateway {
  readonly sharedLinks: SharedLink[] = [];

  constructor(private readonly outcome: ShareOutcome = "shared") {}

  async share(link: SharedLink): Promise<ShareOutcome> {
    this.sharedLinks.push(link);
    return this.outcome;
  }
}
