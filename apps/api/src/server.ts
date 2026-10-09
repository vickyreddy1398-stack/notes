import { createApp } from "./app";
import { env } from "./env";

createApp().listen(env.PORT, () => {
  console.log(`api listening on :${env.PORT}`);
});
