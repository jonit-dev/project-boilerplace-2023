/* eslint-disable array-callback-return */
import { CharacterBuff, ICharacterBuff } from "@entities/ModuleCharacter/CharacterBuffModel";
import { Character, ICharacter } from "@entities/ModuleCharacter/CharacterModel";
import { Equipment, IEquipment } from "@entities/ModuleCharacter/EquipmentModel";
import { ISkill, Skill } from "@entities/ModuleCharacter/SkillsModel";
import { IItemContainer, ItemContainer } from "@entities/ModuleInventory/ItemContainerModel";
import { IItem, Item } from "@entities/ModuleInventory/ItemModel";
import { INPC } from "@entities/ModuleNPC/NPCModel";
import { NewRelic } from "@providers/analytics/NewRelic";
import { TrackNewRelicTransaction } from "@providers/analytics/decorator/TrackNewRelicTransaction";
import { DROP_EQUIPMENT_CHANCE } from "@providers/constants/DeathConstants";
import { InMemoryHashTable } from "@providers/database/InMemoryHashTable";
import { EquipmentSlotTypes } from "@providers/equipment/EquipmentSlots";
import { blueprintManager, entityEffectUse, equipmentSlots } from "@providers/inversify/container";
import { ItemOwnership } from "@providers/item/ItemOwnership";
import {
  AccessoriesBlueprint,
  BodiesBlueprint,
  ContainersBlueprint,
} from "@providers/item/data/types/itemsBlueprintTypes";
import { Locker } from "@providers/locks/Locker";
import { NPCTarget } from "@providers/npc/movement/NPCTarget";
import { SkillDecrease } from "@providers/skill/SkillDecrease";
import { SocketMessaging } from "@providers/sockets/SocketMessaging";
import { Time } from "@providers/time/Time";
import { NewRelicMetricCategory, NewRelicSubCategory } from "@providers/types/NewRelicTypes";
import {
  BattleSocketEvents,
  CharacterBuffType,
  IBattleDeath,
  IUIShowMessage,
  Modes,
  UISocketEvents,
} from "@rpg-engine/shared";
import { provide } from "inversify-binding-decorators";
import _, { random } from "lodash";
import { Types } from "mongoose";
import { clearCacheForKey } from "speedgoose";
import { CharacterDeathCalculator } from "./CharacterDeathCalculator";
import { CharacterInventory } from "./CharacterInventory";
import { CharacterTarget } from "./CharacterTarget";
import { CharacterBuffActivator } from "./characterBuff/CharacterBuffActivator";
import { CharacterItemContainer } from "./characterItems/CharacterItemContainer";
import { CharacterWeight } from "./weight/CharacterWeight";

export const DROPPABLE_EQUIPMENT = [
  "head",
  "neck",
  "leftHand",
  "rightHand",
  "ring",
  "legs",
  "boot",
  "accessory",
  "armor",
];

@provide(CharacterDeath)
export class CharacterDeath {
  constructor(
    private socketMessaging: SocketMessaging,
    private characterTarget: CharacterTarget,
    private npcTarget: NPCTarget,
    private characterInventory: CharacterInventory,
    private itemOwnership: ItemOwnership,
    private characterWeight: CharacterWeight,
    private skillDecrease: SkillDecrease,
    private characterDeathCalculator: CharacterDeathCalculator,
    private characterItemContainer: CharacterItemContainer,
    private inMemoryHashTable: InMemoryHashTable,
    private characterBuffActivator: CharacterBuffActivator,
    private locker: Locker,
    private newRelic: NewRelic,
    private time: Time
  ) {}

  @TrackNewRelicTransaction()
  public async handleCharacterDeath(killer: INPC | ICharacter | null, character: ICharacter): Promise<void> {
    try {
      // try to avoid concurrency issues. Dont remove this for now, because in prod sometimes this method is executed twice.
      await this.time.waitForMilliseconds(random(1, 50));

      const canProceed = await this.locker.lock(`character-death-${character.id}`);

      if (!canProceed) {
        return;
      }

      if (character.health > 0) {
        // if by any reason the char is not dead, make sure it is.
        await Character.updateOne({ _id: character._id }, { $set: { health: 0 } });
        character.health = 0;
        character.isAlive = false;
      }

      if (killer) {
        await this.clearAttackerTarget(killer);
      }

      await entityEffectUse.clearAllEntityEffects(character);

      const characterDeathData: IBattleDeath = {
        id: character.id,
        type: "Character",
      };
      this.socketMessaging.sendEventToUser(character.channelId!, BattleSocketEvents.BattleDeath, characterDeathData);

      // communicate all players around that character is dead

      await this.socketMessaging.sendEventToCharactersAroundCharacter<IBattleDeath>(
        character,
        BattleSocketEvents.BattleDeath,
        characterDeathData
      );

      const characterBody = await this.generateCharacterBody(character);

      if (!character.mode) {
        await this.applyPenalties(character, characterBody);
        return;
      }

      switch (character.mode) {
        case Modes.HardcoreMode:
          await this.applyPenalties(character, characterBody);
          break;
        case Modes.SoftMode:
          // do nothing
          break;
        case Modes.PermadeathMode:
          // penalties forcing all equip/inventory loss
          await this.softDeleteCharacterOnPermaDeathMode(character);
          await this.applyPenalties(character, characterBody, true);
          break;
        default:
          await this.applyPenalties(character, characterBody);
          break;
      }

      this.newRelic.trackMetric(NewRelicMetricCategory.Count, NewRelicSubCategory.Characters, "Death", 1);

      await this.inMemoryHashTable.delete("character-weapon", character._id);
      await this.inMemoryHashTable.delete("character-max-weights", character._id);
      await this.inMemoryHashTable.delete("inventory-weight", character._id);
      await this.inMemoryHashTable.delete("equipment-weight", character._id);
      await clearCacheForKey(`${character._id}-equipment`);
      await this.inMemoryHashTable.delete("equipment-slots", character._id);

      await this.characterWeight.updateCharacterWeight(character);
    } catch {
      await this.locker.unlock(`character-death-${character.id}`);
    } finally {
      await this.respawnCharacter(character);
    }
  }

  @TrackNewRelicTransaction()
  public async generateCharacterBody(character: ICharacter): Promise<IItem> {
    const blueprintData = await blueprintManager.getBlueprint<IItem>("items", BodiesBlueprint.CharacterBody);

    const charBody = new Item({
      ...blueprintData,
      bodyFromId: character.id,
      name: `${character.name}'s body`,
      scene: character.scene,
      texturePath: `${character.textureKey}/death/0.png`,
      x: character.x,
      y: character.y,
    });

    await charBody.save();

    return charBody;
  }

  @TrackNewRelicTransaction()
  public async respawnCharacter(character: ICharacter): Promise<void> {
    await Character.updateOne(
      { _id: character._id },
      {
        $set: {
          health: character.maxHealth,
          mana: character.maxMana,
          x: character.initialX,
          y: character.initialY,
          scene: character.initialScene,
          appliedEntityEffects: [],
        },
      }
    );

    await this.locker.unlock(`character-death-${character.id}`);
  }

  private async softDeleteCharacterOnPermaDeathMode(character: ICharacter): Promise<void> {
    await Character.updateOne({ _id: character._id }, { $set: { isSoftDeleted: true } });
  }

  private async clearAttackerTarget(attacker: ICharacter | INPC): Promise<void> {
    if (attacker.type === "Character") {
      // clear killer's target
      await this.characterTarget.clearTarget(attacker as ICharacter);
    }

    if (attacker.type === "NPC") {
      await this.npcTarget.clearTarget(attacker as INPC);
    }
  }

  private async dropCharacterItemsOnBody(
    character: ICharacter,
    characterBody: IItem,
    equipmentId: Types.ObjectId | undefined,
    forceDropAll: boolean = false
  ): Promise<void> {
    if (!equipmentId) {
      return;
    }

    const equipment = (await Equipment.findById(character.equipment).cacheQuery({
      cacheKey: `${character._id}-equipment`,
    })) as IEquipment;

    equipment.inventory = (await this.characterInventory.getInventory(character)) as unknown as IItem;

    if (!equipment.inventory) {
      this.socketMessaging.sendErrorMessageToCharacter(character, "Sorry, you don't have an inventory");
      return;
    }

    if (!equipment) {
      throw new Error(`No equipment found for id ${equipmentId}`);
    }

    // get item container associated with characterBody
    const bodyContainer = (await ItemContainer.findById(characterBody.itemContainer).lean({
      virtuals: true,
      defaults: true,
    })) as unknown as IItemContainer;

    if (!bodyContainer) {
      throw new Error(`Error fetching itemContainer for Item with key ${characterBody.key}`);
    }

    // there's a chance of dropping any of the equipped items
    await this.dropEquippedItemOnBody(character, bodyContainer, equipment, forceDropAll);

    // drop backpack
    const inventory = equipment.inventory as unknown as IItem;

    if (inventory) {
      await this.dropInventory(character, bodyContainer, inventory, forceDropAll);
    }

    await this.clearAllInventoryItems(inventory as unknown as string, character);
  }

  private async clearAllInventoryItems(inventoryId: string, character: ICharacter): Promise<void> {
    const inventoryItem = await Item.findById(inventoryId).lean();

    await this.clearItem(character, inventoryItem?._id);

    const inventoryContainer = await ItemContainer.findById(inventoryItem?.itemContainer).lean();

    const bodySlots = inventoryContainer?.slots as { [key: string]: IItem };

    const clearItemPromises = Object.values(bodySlots).map((slotItem): any => {
      if (slotItem) {
        return this.clearItem(character, slotItem._id);
      }
    });

    await Promise.all(clearItemPromises);
  }

  private async dropInventory(
    character: ICharacter,
    bodyContainer: IItemContainer,
    inventory: IItem,
    forceDropAll: boolean = false
  ): Promise<void> {
    const n = _.random(0, 100);
    let isDeadBodyLootable = false;

    const skills = (await Skill.findById(character.skills)
      .lean()
      .cacheQuery({
        cacheKey: `${character._id}-skills`,
      })) as unknown as ISkill as ISkill;

    const dropInventoryChance = this.characterDeathCalculator.calculateInventoryDropChance(skills);

    if (n <= dropInventoryChance || forceDropAll) {
      let item = (await Item.findById(inventory._id).lean({
        virtuals: true,
        defaults: true,
      })) as IItem;

      item.itemContainer &&
        (await this.inMemoryHashTable.delete("container-all-items", item.itemContainer.toString()!));

      item = await this.clearItem(character, item._id);

      // now that the slot is clear, lets drop the item on the body
      await this.characterItemContainer.addItemToContainer(item, character, bodyContainer._id, {
        shouldAddOwnership: false,
        shouldAddAsCarriedItem: false,
      });

      if (!isDeadBodyLootable) {
        isDeadBodyLootable = true;
        await Item.updateOne({ _id: bodyContainer.parentItem }, { $set: { isDeadBodyLootable: true } });
      }

      await this.characterInventory.generateNewInventory(character, ContainersBlueprint.Bag, true);
    }
  }

  private async dropEquippedItemOnBody(
    character: ICharacter,
    bodyContainer: IItemContainer,
    equipment: IEquipment,
    forceDropAll: boolean = false
  ): Promise<void> {
    let isDeadBodyLootable = false;

    for (const slot of DROPPABLE_EQUIPMENT) {
      try {
        const itemId = equipment[slot];

        if (!itemId) continue;

        const n = _.random(0, 100);

        if (forceDropAll || n <= DROP_EQUIPMENT_CHANCE) {
          const item = await this.clearItem(character, itemId);

          const removeEquipmentFromSlot = await equipmentSlots.removeItemFromSlot(
            character,
            item.key,
            slot as EquipmentSlotTypes
          );

          if (!removeEquipmentFromSlot) {
            return;
          }

          // now that the slot is clear, lets drop the item on the body
          await this.characterItemContainer.addItemToContainer(item, character, bodyContainer._id, {
            shouldAddOwnership: false,
            shouldAddAsCarriedItem: false,
          });

          if (!isDeadBodyLootable) {
            isDeadBodyLootable = true;
            await Item.updateOne({ _id: bodyContainer.parentItem }, { $set: { isDeadBodyLootable: true } });
          }
        }
      } catch (error) {
        console.error(error);
        continue;
      }
    }
  }

  private async clearItem(character: ICharacter, itemId: string): Promise<IItem> {
    const updatedItem = await Item.findByIdAndUpdate(
      itemId,
      {
        $unset: {
          x: "",
          y: "",
          owner: "",
          scene: "",
          tiledId: "",
        },
      },
      {
        new: true,
        lean: { virtuals: true, defaults: true },
      }
    );

    if (!updatedItem) throw new Error("Item not found"); // Error handling, just in case

    if (updatedItem.itemContainer) {
      await this.itemOwnership.removeItemOwnership(updatedItem);
    }
    await this.removeAllItemBuffs(character, updatedItem);

    return updatedItem as IItem;
  }

  private async removeAllItemBuffs(character: ICharacter, item: IItem): Promise<void> {
    const itemKey = item.key;

    const buff = (await CharacterBuff.findOne({ owner: character._id, itemKey })
      .lean()
      .select("_id type")) as ICharacterBuff;

    if (buff) {
      const disableBuff = await this.characterBuffActivator.disableBuff(
        character,
        buff._id,
        buff.type as CharacterBuffType,
        true
      );

      if (!disableBuff) {
        throw new Error(`Error disabling buff ${buff._id}`);
      }
    }
  }

  private async applyPenalties(
    character: ICharacter,
    characterBody: IItem,
    forceDropAll: boolean = false
  ): Promise<void> {
    if (character.mode === Modes.PermadeathMode) {
      await this.dropCharacterItemsOnBody(character, characterBody, forceDropAll);
      return;
    }

    const amuletOfDeath = await equipmentSlots.hasItemByKeyOnSlot(
      character,
      AccessoriesBlueprint.AmuletOfDeath,
      "neck"
    );

    if (!amuletOfDeath || forceDropAll) {
      // drop equipped items and backpack items
      await this.dropCharacterItemsOnBody(character, characterBody, character.equipment, forceDropAll);

      const deathPenalty = await this.skillDecrease.deathPenalty(character);
      if (deathPenalty) {
        // Set timeout to not overwrite the msg "You are Died"
        setTimeout(() => {
          this.socketMessaging.sendEventToUser<IUIShowMessage>(character.channelId!, UISocketEvents.ShowMessage, {
            message: "You lost some XP and skill points.",
            type: "info",
          });
        }, 2000);
      }
    } else {
      setTimeout(() => {
        this.socketMessaging.sendEventToUser<IUIShowMessage>(character.channelId!, UISocketEvents.ShowMessage, {
          message: "Your Amulet of Death protected your XP and skill points.",
          type: "info",
        });
      }, 2000);

      await equipmentSlots.removeItemFromSlot(character, AccessoriesBlueprint.AmuletOfDeath, "neck");
    }
  }
}
