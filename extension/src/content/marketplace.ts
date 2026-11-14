import {
  isMarketplaceRentalsPage,
  parseMarketplacePage,
} from "../sources/marketplace/parseMarketplacePage";
import { captureWhileBrowsing } from "./captureWhileBrowsing";

captureWhileBrowsing(parseMarketplacePage, isMarketplaceRentalsPage);
