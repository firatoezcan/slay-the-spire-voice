import { app, listen } from "./app";
import { recoverJobs, tick } from "./jobs";
import { stopSpeech } from "./providers/speech";
import { db } from "./store";
import { ambientTick } from "./ambient/director";

recoverJobs();
listen();
console.log(`Voice Director: http://127.0.0.1:${app.server?.port}`);
const timer = setInterval(async () => { await tick(); await ambientTick(); }, 1000);
void tick();
function stop() { clearInterval(timer); stopSpeech(); app.stop(); db.close(); process.exit(0); }
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
