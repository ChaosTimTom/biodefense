export interface Render25dManifest {
  pathogens: Partial<Record<string, string>>;
  medicines: Partial<Record<string, string>>;
  tiles: {
    empty?: string;
    wall?: string;
    perWorld: Partial<Record<number, { empty?: string; wall?: string }>>;
  };
}

export const RENDER_25D_MANIFEST: Render25dManifest = {
  "pathogens": {
    "coccus": "assets/rendered25d/pathogen_coccus.png?v=1774157143820",
    "bacillus": "assets/rendered25d/pathogen_bacillus.png?v=1774210668831",
    "spirillum": "assets/rendered25d/pathogen_spirillum.png?v=1774151304698",
    "influenza": "assets/rendered25d/pathogen_influenza.png?v=1774225873538",
    "retrovirus": "assets/rendered25d/pathogen_retrovirus.png?v=1774241625501",
    "phage": "assets/rendered25d/pathogen_phage.png?v=1774151304989",
    "mold": "assets/rendered25d/pathogen_mold.png?v=1774207377863",
    "yeast": "assets/rendered25d/pathogen_yeast.png?v=1774247442376",
    "spore": "assets/rendered25d/pathogen_spore.png?v=1774151305306"
  },
  "medicines": {
    "penicillin": "assets/rendered25d/medicine_penicillin.png?v=1774159198951",
    "tetracycline": "assets/rendered25d/medicine_tetracycline.png?v=1774220091968",
    "streptomycin": "assets/rendered25d/medicine_streptomycin.png?v=1774151305796",
    "tamiflu": "assets/rendered25d/medicine_tamiflu.png?v=1774240550940",
    "zidovudine": "assets/rendered25d/medicine_zidovudine.png?v=1774241969456",
    "interferon": "assets/rendered25d/medicine_interferon.png?v=1774151306191",
    "fluconazole": "assets/rendered25d/medicine_fluconazole.png?v=1774201279007",
    "nystatin": "assets/rendered25d/medicine_nystatin.png?v=1774151306577",
    "amphotericin": "assets/rendered25d/medicine_amphotericin.png?v=1774151306677"
  },
  "tiles": {
    "perWorld": {
      "1": {
        "empty": "assets/rendered25d/tile_empty_w1.png?v=1774151307265",
        "wall": "assets/rendered25d/tile_wall_w1.png?v=1774154234620"
      },
      "2": {
        "empty": "assets/rendered25d/tile_empty_w2.png?v=1774151307668",
        "wall": "assets/rendered25d/tile_wall_w2.png?v=1774151307864"
      },
      "3": {
        "empty": "assets/rendered25d/tile_empty_w3.png?v=1774151308055",
        "wall": "assets/rendered25d/tile_wall_w3.png?v=1774151308255"
      },
      "4": {
        "empty": "assets/rendered25d/tile_empty_w4.png?v=1774151308444",
        "wall": "assets/rendered25d/tile_wall_w4.png?v=1774151308668"
      }
    },
    "wall": "assets/rendered25d/tile_wall.png?v=1774151307075"
  }
};
