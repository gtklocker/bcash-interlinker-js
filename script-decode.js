const _ = require('lodash');
const bcash = require('bcash');
const fs = require('fs');

const tx = JSON.parse(fs.readFileSync('sample-tx.json'));

function isBurnOutput(output) {
  return output.value === 0;
}

function stringsInScript(script) {
  return Array.from(script.values())
    .map(v => v.data)
    .filter(v => v)
    .map(v => v.toString());
}

const strings = _.flatMap(tx.outputs
  .filter(isBurnOutput)
  .map(o => bcash.Script.fromJSON(o.script)), stringsInScript);

console.log(strings);
