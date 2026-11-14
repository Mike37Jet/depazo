import { parsePlusvaliaPage } from "../sources/plusvalia/parsePlusvaliaPage";
import { captureWhileBrowsing } from "./captureWhileBrowsing";

captureWhileBrowsing(parsePlusvaliaPage, () => true);
