import App from './App.svelte'
import "@ui5/webcomponents/dist/Button";
import "@ui5/webcomponents/dist/BusyIndicator";
import "@ui5/webcomponents/dist/Dialog";
import "@ui5/webcomponents/dist/TabContainer";
import "@ui5/webcomponents/dist/Tab";
import "@ui5/webcomponents-fiori/dist/ShellBar";
import "@ui5/webcomponents-fiori/dist/illustrations/NoData";
import "@ui5/webcomponents-fiori/dist/IllustratedMessage";

const app = new App({
  target: document.getElementById('app')
})

export default app
