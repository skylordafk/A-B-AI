export interface ModelMeta {
  id: string; // provider-specific id
  name: string; // human-readable
  description: string; // short marketing blurb
  contextSize: number; // max tokens context
  pricePrompt: number; // USD per 1K prompt tokens (-1 if flat)
  priceCompletion: number; // USD per 1K completion tokens (-1 if flat)
}
