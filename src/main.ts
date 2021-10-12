import App from "./App.svelte";
import Renoter from "./Renoter.svelte";

import "@ui5/webcomponents/dist/Button";
import "@ui5/webcomponents/dist/BusyIndicator";
import "@ui5/webcomponents/dist/Card";
import "@ui5/webcomponents/dist/CardHeader";
import "@ui5/webcomponents/dist/DatePicker";
import "@ui5/webcomponents/dist/Dialog";
import "@ui5/webcomponents/dist/Input";
import "@ui5/webcomponents/dist/MessageStrip";
import "@ui5/webcomponents/dist/Option";
import "@ui5/webcomponents/dist/Select";
import "@ui5/webcomponents/dist/TabContainer";
import "@ui5/webcomponents/dist/Tab";
import "@ui5/webcomponents/dist/Table";
import "@ui5/webcomponents/dist/TableColumn";
import "@ui5/webcomponents/dist/TableRow";
import "@ui5/webcomponents/dist/TableCell";
import "@ui5/webcomponents/dist/TextArea";
import "@ui5/webcomponents-fiori/dist/Bar";
import "@ui5/webcomponents-fiori/dist/ShellBar";
import "@ui5/webcomponents-fiori/dist/illustrations/NoData";
import "@ui5/webcomponents-fiori/dist/IllustratedMessage";
import "@ui5/webcomponents-icons/dist/activities";
import "@ui5/webcomponents-icons/dist/alert";
import "@ui5/webcomponents-icons/dist/attachment-audio";
import "@ui5/webcomponents-icons/dist/full-stacked-column-chart";
import "@ui5/webcomponents-icons/dist/information";
import "@ui5/webcomponents-icons/dist/media-play";
import "@ui5/webcomponents-icons/dist/message-success";
import "@ui5/webcomponents-icons/dist/synchronize";

const searchParams = new URLSearchParams(window.location.search);

if (searchParams.has("test")) {
  document.title = "[Tests] Song Workshop";
  import("./tests").then((t) => t.main());
} else if (searchParams.has("renote")) {
  document.title = "Renoter";
  new Renoter({
    target: document.getElementById("app"),
    props: {
      renoteSource: searchParams.get("renote"),
    },
  });
} else {
  new App({
    target: document.getElementById("app"),
  });
}
