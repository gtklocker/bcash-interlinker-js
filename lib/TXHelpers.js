const {Script, MTX} = require('bcash');

const SPV_TAG = Buffer.from('interlink');

module.exports = function taggedSPVOutput(buffer) {
  const script = new Script();
  script.pushOp(Script.opcodes.OP_RETURN);
  script.pushData(SPV_TAG);
  script.pushData(buffer);
  return script.compile();
};
