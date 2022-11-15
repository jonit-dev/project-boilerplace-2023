import { IMapMetaData, MapLighteningType } from "@rpg-engine/shared";

export const caveLightening: Partial<IMapMetaData> = {
  lightening: {
    type: MapLighteningType.Static,
    value: 0.8,
  },
};

export const exteriorLightening: Partial<IMapMetaData> = {
  lightening: {
    type: MapLighteningType.Dynamic,
  },
};
