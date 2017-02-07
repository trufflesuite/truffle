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
  <p>Please visit the <a href="http://truffleframework.com/docs/getting_started/projects">page on the new documentation site</a> for up to date information.</p>
</section>

# Create a Project Folder

First create a project folder. You can do this through your favorite file explorer or by running the following on the command line:

```none
$ mkdir myproject
```

# Initialize Your Project

Next, initialize your Truffle project by performing the following in the command line:

```none
$ cd myproject
$ truffle init
```

Once completed, you'll now have a project structure with the following items:

* `app/` - directory where your application files go by default. This includes recommended folders for Javascript files and stylesheets, but you have free reign over how this folder is used, if at all.
* `contracts/` - directory where Truffle expects to find solidity contracts.
* `migrations/` - directory to place scriptable deployment files.
* `test/` - location of test files for testing your application and contracts.
* `truffle.js` - your main Truffle configuration file.

# Default Project: MetaCoin

By default, `truffle init` gives you a demo application called MetaCoin which acts like an alt-coin built inside Ethereum. You can use this project to learn quickly while navigating through the Getting Started guide, or delete these files and build a project of your own.

<script>
  (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
  })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

  ga('create', 'UA-83874933-1', 'auto');
  ga('send', 'pageview');
</script>
