export interface GeneratedAssetManifest {
  backgrounds: Partial<Record<number, string>>;
  bossSplashes: Record<string, string>;
  pathogens: Partial<Record<string, string>>;
  medicines: Partial<Record<string, string>>;
  tiles: {
    empty?: string;
    wall?: string;
    perWorld: Partial<Record<number, { empty?: string; wall?: string }>>;
  };
}

export const GENERATED_ASSET_MANIFEST: GeneratedAssetManifest = {
  "backgrounds": {},
  "bossSplashes": {},
  "pathogens": {},
  "medicines": {},
  "tiles": {
    "perWorld": {}
  }
};
