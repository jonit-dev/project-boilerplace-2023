import { Skill } from "@entities/ModuleCharacter/SkillsModel";
import { Quest } from "@entities/ModuleQuest/QuestModel";
import { createLeanSchema } from "@providers/database/mongooseHelpers";
import {
  CharacterClass,
  CharacterGender,
  MapLayers,
  NPCAlignment,
  NPCMovementType,
  NPCPathOrientation,
  NPCTargetType,
  TypeHelper,
} from "@rpg-engine/shared";
import { EntityAttackType } from "@rpg-engine/shared/dist/types/entity.types";
import { ExtractDoc, Type, typedModel } from "ts-mongoose";

const npcSchema = createLeanSchema(
  {
    name: Type.string({
      required: true,
    }),
    tiledId: Type.number({ required: true }),
    key: Type.string({
      required: true,
    }),
    textureKey: Type.string({
      required: true,
    }),
    health: Type.number({
      required: true,
      default: 100,
    }),
    maxHealth: Type.number({
      required: true,
      default: 100,
    }),
    mana: Type.number({
      default: 0,
      required: true,
    }),
    maxMana: Type.number({
      default: 100,
      required: true,
    }),
    alignment: Type.string({
      required: true,
      default: NPCAlignment.Friendly,
      enum: TypeHelper.enumToStringArray(NPCAlignment),
    }),
    targetType: Type.string({
      required: true,
      default: NPCTargetType.Default,
      enum: TypeHelper.enumToStringArray(NPCTargetType),
    }),
    targetCharacter: Type.objectId({
      ref: "Character",
    }),
    x: Type.number({
      required: true,
    }),
    y: Type.number({
      required: true,
    }),
    initialX: Type.number({
      required: true,
    }),
    initialY: Type.number({
      required: true,
    }),
    direction: Type.string({
      required: true,
      default: "down",
    }),
    scene: Type.string({
      required: true,
    }),
    class: Type.string({
      required: true,
      default: CharacterClass.None,
      enum: TypeHelper.enumToStringArray(CharacterClass),
    }),
    gender: Type.string({
      required: true,
      default: CharacterGender.Male,
      enum: TypeHelper.enumToStringArray(CharacterGender),
    }),
    layer: Type.number({
      required: true,
      default: MapLayers.Character,
    }),
    attackType: Type.string({
      required: true,
      enum: TypeHelper.enumToStringArray(EntityAttackType),
      default: EntityAttackType.Melee,
    }),
    originalMovementType: Type.string({
      required: true,
      enum: TypeHelper.enumToStringArray(NPCMovementType),
    }),
    currentMovementType: Type.string({
      required: true,
      default: NPCMovementType.Random,
      enum: TypeHelper.enumToStringArray(NPCMovementType),
    }),
    ammoKey: Type.string(),
    maxRangeInGridCells: Type.number(),
    maxRangedDistanceInGridCells: Type.number(),
    maxAntiLuringRangeInGridCells: Type.number(),
    pathOrientation: Type.string({
      enum: TypeHelper.enumToStringArray(NPCPathOrientation),
    }),
    fixedPath: {
      endGridX: Type.number(),
      endGridY: Type.number(),
    },
    pm2InstanceManager: Type.number({
      required: true,
    }),
    speed: Type.number({
      default: 1.5,
      required: true,
    }),
    dialogText: Type.string(),
    skills: Type.objectId({
      ref: "Skill",
    }),
    spawnIntervalMin: Type.number({
      required: true,
      default: 1,
    }),
    nextSpawnTime: Type.date(),
    fleeOnLowHealth: Type.boolean({
      default: false,
      required: true,
    }),
    experience: Type.number(),
    xpToRelease: Type.array().of({
      charId: Type.objectId({
        ref: "Character",
        required: true,
      }),
      xp: Type.number({ required: true }),
    }),
    loots: Type.array().of({
      itemBlueprintKey: Type.string({ required: true }),
      chance: Type.number({ required: true, min: 0, max: 100 }),
      quantityRange: Type.array({ required: false, minItems: 2, maxItems: 2 }).of(Type.number()),
    }),
    maxRangeAttack: Type.number({ required: false }),
    canSwitchToRandomTarget: Type.boolean({
      default: false,
      required: true,
    }),
    canSwitchToLowHealthTarget: Type.boolean({
      default: false,
      required: true,
    }),
    isTrader: Type.boolean({}),
    traderItems: Type.array().of({
      key: Type.string({ required: true }),
      price: Type.number({ required: true }),
    }),
    baseHealth: Type.number({ required: true, default: 100 }),
    healthRandomizerDice: Type.number({ required: true, default: 1 }),
    skillRandomizerDice: Type.number({ required: true, default: 1 }),
    skillsToBeRandomized: [Type.string({ required: false })],
    hasDepot: Type.boolean({
      default: false,
    }),
    ...({} as {
      isAlive: boolean;
      type: string;
      xpPerDamage: number;
      hasQuest: Promise<boolean>;
    }),
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

export type INPC = ExtractDoc<typeof npcSchema>;

npcSchema.virtual("isAlive").get(function (this: INPC) {
  return this.health > 0;
});

npcSchema.virtual("type").get(function (this: INPC) {
  return "NPC";
});

npcSchema.virtual("xpPerDamage").get(function (this: INPC) {
  // initial health = 100, xpPerDamage = experience / initial health
  return this.experience ? this.experience / this.maxHealth : 0;
});

npcSchema.virtual("hasQuest").get(async function (this: INPC) {
  const npcQuests = await Quest.find({ npcId: this._id });
  return !!npcQuests.length;
});

npcSchema.post("remove", async function (this: INPC) {
  // remove associated skill model

  const skill = await Skill.findOne({ _id: this.skills });

  if (skill) {
    await skill.remove();
  }
});

export const NPC = typedModel("NPC", npcSchema);
