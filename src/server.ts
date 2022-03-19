import "express-async-errors";
import "reflect-metadata";

import { appEnv } from "@providers/config/env";
import {
  cronJobs,
  db,
  npcLoader,
  npcManager,
  seeds,
  server,
  socketAdapter,
  tilemapParser,
} from "@providers/inversify/container";
import { errorHandlerMiddleware } from "@providers/middlewares/ErrorHandlerMiddleware";
import { PushNotificationHelper } from "@providers/pushNotification/PushNotificationHelper";
import { app } from "@providers/server/app";
import { router } from "@providers/server/Router";
import { EnvType } from "@rpg-engine/shared/dist";
import * as Sentry from "@sentry/node";
import * as Tracing from "@sentry/tracing";

const port = appEnv.general.SERVER_PORT || 3002;

app.listen(port, async () => {
  tilemapParser.init();

  server.showBootstrapMessage({
    appName: appEnv.general.APP_NAME!,
    port: appEnv.general.SERVER_PORT!,
    timezone: appEnv.general.TIMEZONE!,
    adminEmail: appEnv.general.ADMIN_EMAIL!,
    language: appEnv.general.LANGUAGE!,
    phoneLocale: appEnv.general.PHONE_LOCALE!,
  });
  npcLoader.init(); //! This must come before our seeds.start(), otherwise it won't have the data to create our NPCs.

  await db.init();
  await cronJobs.start();

  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
  app.use(router);

  app.use(Sentry.Handlers.errorHandler());
  app.use(errorHandlerMiddleware);

  // Firebase-admin setup, that push notification requires.
  PushNotificationHelper.initialize();

  await seeds.start();

  await socketAdapter.init(appEnv.socket.type);

  //! TODO: Allocate according to pm2 instances

  await npcManager.init();

  if (appEnv.general.ENV === EnvType.Production) {
    Sentry.init({
      dsn: appEnv.general.SENTRY_DNS_URL,
      integrations: [
        // enable HTTP calls tracing
        new Sentry.Integrations.Http({ tracing: true }),
        // enable Express.js middleware tracing
        new Tracing.Integrations.Express({ app }),
      ],

      // Set tracesSampleRate to 1.0 to capture 100%
      // of transactions for performance monitoring.
      // We recommend adjusting this value in production
      tracesSampleRate: 1.0,
    });
  }
});
