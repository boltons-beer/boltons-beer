import app from "./http.ts";
import * as Queue from "./queue.ts";

Deno.serve(app.fetch);
await Queue.startListener();
