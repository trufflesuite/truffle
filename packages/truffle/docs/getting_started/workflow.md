# Commands

We've recommended the [EthereumJS TestRPC](https://github.com/ethereumjs/testrpc) a number of times to get you quick feedback during development. However, Truffle comes with two commands that can make development even faster.

### truffle watch

Watch your filesystem for changes and recompile and redeploy your contracts, if needed, and rebuild your frontend when there are changes.

Usage:

```
$ truffle watch
```

See the [command reference](/advanced/commands) for more information.

### truffle serve

Watch your filesystem for changes and recompile, redeploy and rebuild, like `truffle watch`, and serve the built project on *http://localhost:8080*.

Usage:

```
$ truffle serve
```

You can override the port Truffle serves on. See the [command reference](/advanced/commands) for more information.

<script>
  (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
  })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

  ga('create', 'UA-83874933-1', 'auto');
  ga('send', 'pageview');
</script>
