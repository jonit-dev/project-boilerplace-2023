import { Container } from "inversify";
import { buildProviderModule } from "inversify-binding-decorators";

import { Cronjob } from "../cronjobs/CronJobs";
import { Seeder } from "../seeds/Seeder";
import { Database } from "../server/Database";
import { ServerHelper } from "../server/ServerHelper";
import { abTestsControllerContainer, dbTasksControllerContainer, userControllerContainer } from "./ControllersInversify";

const container = new Container();

container.load(buildProviderModule(), userControllerContainer, dbTasksControllerContainer, abTestsControllerContainer);

export const db = container.get<Database>(Database);
export const cronJobs = container.get<Cronjob>(Cronjob);
export const seeds = container.get<Seeder>(Seeder);
export const server = container.get<ServerHelper>(ServerHelper);

export { container };
