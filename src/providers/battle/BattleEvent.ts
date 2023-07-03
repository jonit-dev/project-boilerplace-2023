import { ICharacter } from "@entities/ModuleCharacter/CharacterModel";
import { ISkill } from "@entities/ModuleCharacter/SkillsModel";
import { IItem } from "@entities/ModuleInventory/ItemModel";
import { INPC } from "@entities/ModuleNPC/NPCModel";
import { TrackNewRelicTransaction } from "@providers/analytics/decorator/TrackNewRelicTransaction";
import { CharacterWeapon } from "@providers/character/CharacterWeapon";
import {
  BATTLE_CRITICAL_HIT_CHANCE,
  BATTLE_CRITICAL_HIT_DAMAGE_MULTIPLIER,
} from "@providers/constants/BattleConstants";
import { PVP_ROGUE_ATTACK_DAMAGE_INCREASE_MULTIPLIER } from "@providers/constants/PVPConstants";
import { SkillStatsCalculator } from "@providers/skill/SkillsStatsCalculator";
import { TraitGetter } from "@providers/skill/TraitGetter";
import {
  BasicAttribute,
  BattleEventType,
  CharacterClass,
  CombatSkill,
  EntityAttackType,
  EntityType,
  SKILLS_MAP,
} from "@rpg-engine/shared";
import { provide } from "inversify-binding-decorators";
import _ from "lodash";

type BattleParticipant = ICharacter | INPC;

@provide(BattleEvent)
export class BattleEvent {
  constructor(
    private skillStatsCalculator: SkillStatsCalculator,
    private characterWeapon: CharacterWeapon,
    private traitGetter: TraitGetter
  ) {}

  @TrackNewRelicTransaction()
  public async calculateEvent(attacker: BattleParticipant, target: BattleParticipant): Promise<BattleEventType> {
    const attackerSkills = attacker.skills as unknown as ISkill;
    const defenderSkills = target.skills as unknown as ISkill;

    const defenderDefense = await this.skillStatsCalculator.getDefense(defenderSkills);
    const attackerAttack = await this.skillStatsCalculator.getAttack(attackerSkills);

    const attackerDexterityLevel = await this.traitGetter.getSkillLevelWithBuffs(
      attackerSkills,
      BasicAttribute.Dexterity
    );
    const defenderDexterityLevel = await this.traitGetter.getSkillLevelWithBuffs(
      defenderSkills,
      BasicAttribute.Dexterity
    );

    const defenderModifiers = defenderDefense + defenderDexterityLevel;
    const attackerModifiers = attackerAttack + attackerDexterityLevel;

    const hasHitSucceeded = await this.hasBattleEventSucceeded(
      attacker as ICharacter,
      attackerModifiers,
      defenderModifiers,
      "attack"
    );

    if (hasHitSucceeded) {
      return BattleEventType.Hit;
    }

    const hasBlockSucceeded = await this.hasBattleEventSucceeded(
      target as ICharacter,
      defenderModifiers,
      attackerModifiers,
      "defense"
    );

    if (hasBlockSucceeded) {
      return BattleEventType.Block;
    }

    return BattleEventType.Miss;
  }

  @TrackNewRelicTransaction()
  public async calculateHitDamage(
    attacker: BattleParticipant,
    target: BattleParticipant,
    isMagicAttack: boolean = false
  ): Promise<number> {
    const attackerSkills = attacker.skills as unknown as ISkill;
    const defenderSkills = target.skills as unknown as ISkill;

    const weapon = await this.characterWeapon.getWeapon(attacker as ICharacter);

    let totalPotentialAttackerDamage = await this.calculateTotalPotentialDamage(
      attackerSkills,
      defenderSkills,
      isMagicAttack,
      weapon?.item
    );

    if (attacker.type === EntityType.Character && target.type === EntityType.Character) {
      totalPotentialAttackerDamage += await this.calculateExtraDamageBasedOnClass(
        attacker.class as CharacterClass,
        totalPotentialAttackerDamage
      );
    }

    let damage =
      weapon?.item && weapon?.item.isTraining
        ? Math.round(_.random(0, 1))
        : Math.round(_.random(0, totalPotentialAttackerDamage));

    damage = await this.implementDamageReduction(defenderSkills, target, damage, isMagicAttack);

    // damage cannot be higher than target's remaining health
    return damage > target.health ? target.health : damage;
  }

  public getCriticalHitDamageIfSucceed(damage: number): number {
    const hasCriticalHitSucceeded = _.random(0, 100) <= BATTLE_CRITICAL_HIT_CHANCE;

    if (hasCriticalHitSucceeded) return damage * BATTLE_CRITICAL_HIT_DAMAGE_MULTIPLIER;

    return damage;
  }

  private async implementDamageReduction(
    defenderSkills: ISkill,
    target: ICharacter | INPC,
    damage: number,
    isMagicAttack: boolean
  ): Promise<number> {
    if (target.type === "Character") {
      const character = target as ICharacter;

      const hasShield = await this.characterWeapon.hasShield(character);

      const defenderShieldingLevel = await this.traitGetter.getSkillLevelWithBuffs(
        defenderSkills,
        CombatSkill.Shielding
      );
      const defenderResistanceLevel = await this.traitGetter.getSkillLevelWithBuffs(
        defenderSkills,
        BasicAttribute.Resistance
      );
      const defenderMagicResistanceLevel = await this.traitGetter.getSkillLevelWithBuffs(
        defenderSkills,
        BasicAttribute.MagicResistance
      );

      // we only take into account the shielding skill if the defender has a shield equipped.
      if (hasShield) {
        if (defenderShieldingLevel > 1) {
          damage = this.calculateDamageReduction(
            damage,
            this.calculateCharacterShieldingDefense(
              defenderSkills.level,
              defenderResistanceLevel,
              defenderShieldingLevel
            )
          );
        }
      }

      // if no shield or magic attack, we just take the defender level and resistance when reducing the damage.
      if (!hasShield && !isMagicAttack) {
        damage = this.calculateDamageReduction(
          damage,
          this.calculateCharacterRegularDefense(defenderSkills.level, defenderResistanceLevel)
        );
      }

      // if magic attack, we take the defender level and magic resistance when reducing the damage.
      if (isMagicAttack) {
        damage = this.calculateDamageReduction(
          damage,
          this.calculateCharacterRegularDefense(defenderSkills.level, defenderMagicResistanceLevel)
        );
      }
    }

    return damage;
  }

  private async calculateTotalPotentialDamage(
    attackerSkills: ISkill,
    defenderSkills: ISkill,
    isMagicAttack: boolean,
    weapon: IItem | undefined
  ): Promise<number> {
    let attackerTotalAttack, defenderTotalDefense;

    if (isMagicAttack) {
      attackerTotalAttack = await this.skillStatsCalculator.getMagicAttack(attackerSkills);
      defenderTotalDefense = await this.skillStatsCalculator.getMagicDefense(defenderSkills);
    } else {
      attackerTotalAttack = await this.skillStatsCalculator.getAttack(attackerSkills);
      defenderTotalDefense = await this.skillStatsCalculator.getDefense(defenderSkills);
      attackerTotalAttack += this.calculateExtraDamageBasedOnSkills(weapon, attackerSkills);
    }

    return _.round(attackerTotalAttack * (100 / (100 + defenderTotalDefense)));
  }

  private async hasBattleEventSucceeded(
    character: ICharacter,
    actionModifier: number,
    oppositeActionModifier: number,
    type: "attack" | "defense"
  ): Promise<boolean> {
    if (type === "attack") {
      const attackType = await this.characterWeapon.getAttackType(character);
      if (!attackType) {
        return false;
      }
      actionModifier = this.calculateActionModifier(attackType, actionModifier);
    }

    const chance = (actionModifier / (oppositeActionModifier + actionModifier)) * 100;
    const n = _.random(0, 100);

    return n <= chance;
  }

  private calculateActionModifier(attackType: EntityAttackType, actionModifier: number): number {
    // make it easier to hit when you're ranged
    if (attackType === EntityAttackType.Ranged) {
      actionModifier *= 2;
    }
    return actionModifier;
  }

  private calculateCharacterShieldingDefense(level: number, resistanceLevel: number, shieldingLevel: number): number {
    return this.calculateCharacterRegularDefense(level, resistanceLevel) + Math.floor(shieldingLevel / 2);
  }

  private calculateCharacterRegularDefense(level: number, resistanceLevel: number): number {
    return resistanceLevel + level;
  }

  private calculateDamageReduction(damage: number, characterDefense: number): number {
    let realDamage = 0;
    realDamage = damage - Math.floor(characterDefense / 5);
    if (realDamage < damage && realDamage > 0) {
      return realDamage;
    }
    return realDamage > 0 ? realDamage : damage;
  }

  private calculateExtraDamageBasedOnSkills(weapon: IItem | undefined, characterSkills: ISkill): number {
    const weaponSubType = weapon ? weapon.subType || "None" : "None";
    const skillName = SKILLS_MAP.get(weaponSubType);
    if (!skillName) {
      return 0;
    }
    return Math.floor(characterSkills[skillName].level / 2);
  }

  private calculateExtraDamageBasedOnClass(clas: CharacterClass, calculatedDamage: number): number {
    if (clas === CharacterClass.Rogue) {
      return Math.floor(calculatedDamage * PVP_ROGUE_ATTACK_DAMAGE_INCREASE_MULTIPLIER);
    }
    return 0;
  }
}
