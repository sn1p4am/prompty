import {
  flowRendererV2,
  flowStyles
} from "./chunk-LAMGBKNL.js";
import {
  flowDb,
  parser$1
} from "./chunk-DOHXCQPV.js";
import "./chunk-CGDYAW5C.js";
import "./chunk-RBNMLPOZ.js";
import "./chunk-XA3WP4JI.js";
import "./chunk-E4GNKLRT.js";
import "./chunk-BJBBI2KH.js";
import {
  require_dayjs_min,
  require_dist,
  setConfig
} from "./chunk-TS4UBEEA.js";
import {
  __toESM
} from "./chunk-PR4QN5HX.js";

// node_modules/mermaid/dist/flowDiagram-v2-4f6560a1.js
var import_dayjs = __toESM(require_dayjs_min(), 1);
var import_sanitize_url = __toESM(require_dist(), 1);
var diagram = {
  parser: parser$1,
  db: flowDb,
  renderer: flowRendererV2,
  styles: flowStyles,
  init: (cnf) => {
    if (!cnf.flowchart) {
      cnf.flowchart = {};
    }
    cnf.flowchart.arrowMarkerAbsolute = cnf.arrowMarkerAbsolute;
    setConfig({ flowchart: { arrowMarkerAbsolute: cnf.arrowMarkerAbsolute } });
    flowRendererV2.setConf(cnf.flowchart);
    flowDb.clear();
    flowDb.setGen("gen-2");
  }
};
export {
  diagram
};
//# sourceMappingURL=flowDiagram-v2-4f6560a1-46ONAIHA.js.map
