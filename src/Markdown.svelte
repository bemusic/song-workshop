<script lang="ts">
  import Markdown from "markdown-it";

  const markdown = new Markdown({
    linkify: true,
    breaks: true,
    typographer: true,
  });

  export let source: string;

  $: html = markdown.render(source);
</script>

{@html html}
