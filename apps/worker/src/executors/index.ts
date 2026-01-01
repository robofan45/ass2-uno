import { transformJsonata } from "./transformJsonata.js";
import { actionHttp } from "./actionHttp.js";
import { actionSlack } from "./actionSlack.js";
import { approvalHuman } from "./approvalHuman.js";
import { aiAgent } from "./aiAgent.js";

export const executors: Record<string, any> = {
  "transform.jsonata": transformJsonata,
  "action.http": actionHttp,
  "action.slack": actionSlack,
  "approval.human": approvalHuman,
  "ai.agent": aiAgent,

  // trigger nodes are not executed as steps in this MVP scaffold;
  // triggerInput is stored on the Run and used by downstream nodes.
  "trigger.webhook": async () => ({})
};
