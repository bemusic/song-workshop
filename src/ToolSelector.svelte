<main>
  <ui5-shellbar id="shellbar" primary-title="Bemuse Custom Song Workshop" />

  <ui5-product-switch>
    <ui5-product-switch-item
      title-text="Custom Song"
      subtitle-text="Prepare song for Bemuse"
      icon="factory"
      on:click={() => (location.href = "?app=song")}
    />
    <ui5-product-switch-item
      title-text="Tests"
      subtitle-text="Run unit tests"
      icon="lab"
      on:click={() => (location.href = "?test")}
    />
  </ui5-product-switch>
</main>
