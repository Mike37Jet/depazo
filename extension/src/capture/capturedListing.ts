import * as z from "zod/mini";

export const CAPTURE_FORMAT = "depazo.capture";
export const CAPTURE_FORMAT_VERSION = 1;
export const MAX_STORED_LISTINGS = 5000;

const httpsUrl = z.url({ protocol: /^https$/ }).check(z.maxLength(2048));
const optionalAmount = z.nullable(z.number().check(z.nonnegative()));
const optionalCount = z.nullable(z.int().check(z.nonnegative(), z.lte(50)));
const optionalPlace = z.nullable(z.string().check(z.minLength(1), z.maxLength(120)));

export const capturedListingSchema = z.strictObject({
  source: z.literal("plusvalia"),
  externalId: z.string().check(z.regex(/^[\w-]{1,64}$/)),
  url: httpsUrl,
  title: z.string().check(z.minLength(1), z.maxLength(300)),
  monthlyRentUsd: optionalAmount,
  condoFeeUsd: optionalAmount,
  areaM2: z.nullable(z.number().check(z.positive())),
  bedrooms: optionalCount,
  bathrooms: optionalCount,
  neighborhood: optionalPlace,
  city: optionalPlace,
  imageUrl: z.nullable(httpsUrl),
  capturedAt: z.iso.datetime(),
});

export type CapturedListing = z.infer<typeof capturedListingSchema>;

export const capturedListingsSchema = z
  .array(capturedListingSchema)
  .check(z.maxLength(MAX_STORED_LISTINGS));

export const captureExportSchema = z.strictObject({
  format: z.literal(CAPTURE_FORMAT),
  version: z.literal(CAPTURE_FORMAT_VERSION),
  exportedAt: z.iso.datetime(),
  listings: capturedListingsSchema,
});

export type CaptureExport = z.infer<typeof captureExportSchema>;
