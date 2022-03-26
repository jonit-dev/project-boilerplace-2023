import "reflect-metadata";
import "express-async-errors";
import { TilemapParser } from "@providers/map/TilemapParser";
import { NPCMetaDataLoader } from "@providers/npc/NPCLoader";
import { NPCManager } from "@providers/npc/NPCManager";
import { Player } from "@providers/player/Player";
import { SocketAdapter } from "@providers/sockets/SocketAdapter";
import { UnitTestHelper } from "@providers/unitTests/UnitTestHelper";
import { Container } from "inversify";
import { buildProviderModule } from "inversify-binding-decorators";
import { Cronjob } from "../cronjobs/CronJobs";
import { Seeder } from "../seeds/Seeder";
import { Database } from "../server/Database";
import { ServerHelper } from "../server/ServerHelper";
import {
  abTestsControllerContainer,
  dbTasksControllerContainer,
  formControllerContainer,
  useCasesControllers,
  userControllerContainer,
} from "./ControllersInversify";

const container = new Container();

container.load(
  buildProviderModule(),
  userControllerContainer,
  dbTasksControllerContainer,
  abTestsControllerContainer,
  formControllerContainer,
  useCasesControllers
);

export const db = container.get<Database>(Database);
export const cronJobs = container.get<Cronjob>(Cronjob);
export const seeds = container.get<Seeder>(Seeder);
export const server = container.get<ServerHelper>(ServerHelper);
export const socketAdapter = container.get<SocketAdapter>(SocketAdapter);
export const player = container.get<Player>(Player);
export const tilemapParser = container.get<TilemapParser>(TilemapParser);
export const npcManager = container.get<NPCManager>(NPCManager);
export const npcMetaDataLoader = container.get<NPCMetaDataLoader>(NPCMetaDataLoader);
export const unitTestHelper = container.get<UnitTestHelper>(UnitTestHelper);

export { container };
