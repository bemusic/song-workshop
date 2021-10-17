<main>
  <ui5-shellbar id="shellbar" primary-title="Bemuse Custom Song Workshop" />

  <ui5-product-switch>
    <ui5-product-switch-item
      title-text="Custom Song"
      subtitle-text="Prepare song data"
      icon="factory"
      on:click={() => (location.href = "?app=song")}
    />
    <ui5-product-switch-item
      title-text="Server Manager"
      subtitle-text="Prepare server file"
      icon="shelf"
      on:click={() => (location.href = "?app=server-manager")}
    />
    <ui5-product-switch-item
      title-text="Tests"
      subtitle-text="Run unit tests"
      icon="lab"
      on:click={() => (location.href = "?test")}
    />
  </ui5-product-switch>
</main>
