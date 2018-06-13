<style>
  .DocumentationWarning {
    text-align: center;
    padding: 1rem;
    background:rgb(255, 101, 52);
  }

  .DocumentationWarning a {
    color: white;
  }
</style>
<section class="DocumentationWarning">
  <h1>These documents are out of date</h1>
  <p>Please visit the <a href="http://truffleframework.com/docs/getting_started/scripts">page on the new documentation site</a> for up to date information.</p>
</section>

# Background

Often you may want to run external scripts that interact with your contracts. Truffle provides an easy way to do this, bootstrapping your contracts based on your desired network and connecting to your Ethereum client automatically per your [project configuration](/advanced/configuration).

# Command

To run an external script, perform the following:

```
$ truffle exec <path/to/file.js>
```

# File Structure

In order for external scripts to be run correctly, Truffle expects them to export a function that takes a single parameter as a callback:

```javascript
module.exports = function(callback) {
  // perform actions
}
```

You can do anything you'd like within this script, so long as the callback is called when the script finishes. The callback accepts an error as its first and only parameter. If an error is provided, execution will halt and the process will return a non-zero exit code.

<script>
  (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
  })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

  ga('create', 'UA-83874933-1', 'auto');
  ga('send', 'pageview');
</script>
