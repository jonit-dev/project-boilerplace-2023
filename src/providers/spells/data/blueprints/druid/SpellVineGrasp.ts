import { ICharacter } from "@entities/ModuleCharacter/CharacterModel";
import { INPC } from "@entities/ModuleNPC/NPCModel";
import { HitTarget } from "@providers/battle/HitTarget";
import { EntityEffectUse } from "@providers/entityEffects/EntityEffectUse";
import { entityEffectVineGrasp } from "@providers/entityEffects/data/blueprints/entityEffectVineGrasp";
import { characterBuffActivator, container } from "@providers/inversify/container";
import {
  AnimationEffectKeys,
  BasicAttribute,
  CharacterAttributes,
  CharacterBuffDurationType,
  CharacterBuffType,
  CharacterClass,
  ISpell,
  MagicPower,
  RangeTypes,
  SpellCastingType,
  SpellsBlueprint,
} from "@rpg-engine/shared";
import { SpellCalculator } from "../../abstractions/SpellCalculator";

export const spellVineGrasp: Partial<ISpell> = {
  key: SpellsBlueprint.VineGrasp,
  name: "Vine Grasp",
  description:
    "Summons the inherent power of nature, quickly manifesting a surge of entwining, thorny vines from the ground that shoot towards the enemy like a bolt.",
  castingType: SpellCastingType.RangedCasting,
  magicWords: "gwedh lingalad",
  manaCost: 80,
  minLevelRequired: 12,
  minMagicLevelRequired: 15,
  cooldown: 120,
  castingAnimationKey: AnimationEffectKeys.SkillLevelUp,
  targetHitAnimationKey: AnimationEffectKeys.Rooted,
  projectileAnimationKey: AnimationEffectKeys.HitPoison,
  maxDistanceGrid: RangeTypes.High,
  characterClass: [CharacterClass.Druid],

  usableEffect: async (character: ICharacter, target: ICharacter | INPC) => {
    const entityEffectUse = container.get(EntityEffectUse);
    const hitTarget = container.get(HitTarget);
    const spellCalculator = container.get(SpellCalculator);

    await hitTarget.hit(character, target, true, MagicPower.Medium, true);

    await entityEffectUse.applyEntityEffects(target, character, entityEffectVineGrasp);

    const timeout = await spellCalculator.calculateBasedOnSkillLevel(character, BasicAttribute.Magic, {
      min: 20,
      max: 40,
    });

    const debuffPercentage = await spellCalculator.calculateBasedOnSkillLevel(character, BasicAttribute.Magic, {
      min: 5,
      max: 15,
    });

    if (target.type === "Character") {
      await characterBuffActivator.enableTemporaryBuff(target as ICharacter, {
        type: CharacterBuffType.CharacterAttribute,
        trait: CharacterAttributes.Speed,
        buffPercentage: -debuffPercentage,
        durationSeconds: timeout,
        durationType: CharacterBuffDurationType.Temporary,
        options: {
          messages: {
            activation: `Your speed is reduced! (-${debuffPercentage}%)`,
            deactivation: "Your speed is back to normal!",
          },
        },
        isStackable: false,
        originateFrom: SpellsBlueprint.VineGrasp,
      });
    }

    return true;
  },
};
