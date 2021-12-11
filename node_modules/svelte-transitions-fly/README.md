# svelte-transitions-fly

Fly transition plugin for [Svelte](https://svelte.technology). [Demo](https://svelte.technology/repl?version=2.5.0&gist=07f809dba875d3c4f85ecd47a044ec3e)

![fly-hello](https://cloud.githubusercontent.com/assets/1162160/25782007/fe173098-330f-11e7-9071-68d464ca72f0.gif)

## Usage

Recommended usage is via [svelte-transitions](https://github.com/sveltejs/svelte-transitions), but you can use this module directly if you prefer. Note that it assumes an ES module or CommonJS environment.

Install with npm or yarn:

```bash
npm install --save svelte-transitions-fly
```

Then add the plugin to your Svelte component's exported definition:

```html
<label>
  <input type='checkbox' bind:checked='visible'> visible
</label>

{#if visible}
  <!-- use `in`, `out`, or `transition` (bidirectional) -->
  <div transition:fly='{y:-20}'>hello!</div>
{/if}

<script>
  import fly from 'svelte-transitions-fly';

  export default {
    transitions: { fly }
  };
</script>
```


## Parameters

`x` and `y` are the position the node will fly in from (and out to). Both default to zero:

```html
<div in:fly='{x: -200}'>
  flies in from the left
</div>
```

You can also specify `delay` and `duration` parameters, which default to `0` and `400` respectively, and a custom `easing` function (which should live on your `helpers`):

```html
<div in:fly='{x: -200, delay: 250, duration: 1000, easing: elasticOut}'>
  wheee!!!!
</div>

<script>
  import fly from 'svelte-transitions-fly';
  import { elasticOut } from 'eases-jsnext';

  export default {
    helpers: { elasticOut },
    transitions: { fly }
  };
</script>
```


## License

[MIT](LICENSE)
