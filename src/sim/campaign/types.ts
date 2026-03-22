export type ObjectivePref = "contain" | "clear_all" | "either";

export interface CampaignBlueprint {
  level: number;
  recipeLevel: number;
  seed: number;
  objective: ObjectivePref;
  title?: string;
  hint?: string;
}
