/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { ICharacter } from "@entities/ModuleCharacter/CharacterModel";
import { IItemContainer, ItemContainer } from "@entities/ModuleInventory/ItemContainerModel";
import { IItem } from "@entities/ModuleInventory/ItemModel";
import { INPC } from "@entities/ModuleNPC/NPCModel";
import { container, unitTestHelper } from "@providers/inversify/container";
import { OthersBlueprint, RangedWeaponsBlueprint } from "@providers/item/data/types/itemsBlueprintTypes";
import { SocketMessaging } from "@providers/sockets/SocketMessaging";
import { ItemSocketEvents } from "@rpg-engine/shared";
import { CharacterTradingNPCSell } from "../CharacterTradingNPCSell";

describe("CharacterTradingNPCSell.ts", () => {
  let testCharacter: ICharacter;
  let testNPCTrader: INPC;
  let inventory: IItem;
  let inventoryContainer: IItemContainer;

  let characterTradingNPCSell: CharacterTradingNPCSell;
  let sendErrorMessageToCharacter: jest.SpyInstance;
  let sendEventToUser: jest.SpyInstance;

  beforeAll(async () => {
    await unitTestHelper.beforeAllJestHook();

    characterTradingNPCSell = container.get<CharacterTradingNPCSell>(CharacterTradingNPCSell);
  });

  afterAll(async () => {
    await unitTestHelper.afterAllJestHook();
  });

  const addItemsToInventory = async () => {
    const items = [
      await unitTestHelper.createMockItemFromBlueprint(RangedWeaponsBlueprint.Slingshot),
      await unitTestHelper.createMockItemFromBlueprint(RangedWeaponsBlueprint.Slingshot),
      await unitTestHelper.createMockItemFromBlueprint(RangedWeaponsBlueprint.Arrow, { stackQty: 50 }),
      await unitTestHelper.createMockItemFromBlueprint(RangedWeaponsBlueprint.Arrow, { stackQty: 50 }),
    ];

    await unitTestHelper.addItemsToInventoryContainer(inventoryContainer, 6, items);
  };

  const prepareData = async () => {
    testCharacter = await unitTestHelper.createMockCharacter(
      {
        x: 0,
        y: 0,
      },
      { hasEquipment: true, hasInventory: true, hasSkills: true }
    );

    testNPCTrader = await unitTestHelper.createMockNPC({
      x: 0,
      y: 0,
      isTrader: true,
      traderItems: [],
    });

    inventory = await testCharacter.inventory;
    inventoryContainer = (await ItemContainer.findById(inventory.itemContainer)) as unknown as IItemContainer;
  };

  beforeEach(async () => {
    await unitTestHelper.beforeEachJestHook(true);
    await prepareData();

    sendErrorMessageToCharacter = jest.spyOn(SocketMessaging.prototype, "sendErrorMessageToCharacter");
    sendEventToUser = jest.spyOn(SocketMessaging.prototype, "sendEventToUser");

    await addItemsToInventory();
  });

  it("should successfully sell stackable and non stackable items", async () => {
    await characterTradingNPCSell.sellItemsToNPC(testCharacter, testNPCTrader, [
      {
        key: RangedWeaponsBlueprint.Slingshot,
        qty: 1,
      },
      {
        key: RangedWeaponsBlueprint.Arrow,
        qty: 10,
      },
    ]);

    const updatedContainer = (await ItemContainer.findById(inventory.itemContainer)) as unknown as IItemContainer;

    expect(updatedContainer.slots[0]).not.toBeNull();
    expect(updatedContainer.slots[0].key).toBe(OthersBlueprint.GoldCoin);
    expect(updatedContainer.slots[0].stackQty).toBe(15);

    expect(updatedContainer.slots[2]).not.toBeNull();
    expect(updatedContainer.slots[2].key).toBe(RangedWeaponsBlueprint.Arrow);
    expect(updatedContainer.slots[2].stackQty).toBe(40);

    expect(sendErrorMessageToCharacter).not.toBeCalled();
    expect(sendEventToUser).toBeCalledTimes(1);

    expect(sendEventToUser).toHaveBeenCalledWith(
      testCharacter.channelId!,
      ItemSocketEvents.EquipmentAndInventoryUpdate,
      {
        inventory: updatedContainer,
        openEquipmentSetOnUpdate: false,
        openInventoryOnUpdate: true,
      }
    );
  });
});
