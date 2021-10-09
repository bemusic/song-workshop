import "mocha/mocha.css";
import "mocha/mocha.js";

export async function main() {
  setupMocha();
  const modules = import.meta.glob("./**.spec.ts");
  for (const path in modules) {
    await modules[path]();
  }
  runMocha();
}

function setupMocha() {
  let mochaElement = document.createElement("div");
  mochaElement.id = "mocha";
  document.body.appendChild(mochaElement);
  mocha.setup("bdd");
}

function runMocha() {
  let specs = [];
  // @ts-ignore
  mocha.run().on("test end", function reportFailedSpec(test) {
    if (test.err) {
      console.error(test.err.stack);
    }
  });
}

await main();
