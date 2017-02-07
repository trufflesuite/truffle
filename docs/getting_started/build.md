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
  <p>Please visit the <a href="http://truffleframework.com/docs/getting_started/build">page on the new documentation site</a> for up to date information.</p>
</section>

# Default Builder

Truffle comes standard with a default build system which is meant to be easy to use. It's not suitable for every project, and you may choose to use other build systems to package your application. See the [advanced build processes](/advanced/build_processes) section for more details. Note that the default builder is targeted towards web applications, but it can be easily swapped out for another build process that works better for command line tools and libraries.

# Features

The default builder comes with a few standard niceties meant to get you started quickly:

* Automatic bootstrapping of your application within the browser, importing your compiled contract artifacts, deployed contract information and Ethereum client configuration automatically.
* Inclusion of recommended dependencies, including [web3](https://github.com/ethereum/web3.js/tree/master) and [Ether Pudding](https://github.com/ConsenSys/ether-pudding).
* Support for ES6 and JSX built-in.
* SASS support for manageable CSS.
* And UglifyJS support for creating minified versions of your Javascript assets.

# Configuration

The default builder gives you complete control over how you want to organize your files and folders, but the default directory structure looks like this:

```none
app/
- javascripts/
  - app.js
- stylesheets/
  - app.css
- images/
- index.html
```

It's corresponding configuration within your [project configuration](/advanced/configuration) looks very similar:

```javascript
{
  "build": {
    // Copy ./app/index.html (right hand side) to ./build/index.html (left hand side).
    "index.html": "index.html",

    // Process all files in the array, concatenating them together
    // to create a resultant app.js
    "app.js": [
      "javascripts/app.js"
    ],

    // Process all files in the array, concatenating them together
    // to create a resultant app.css
    "app.css": [
      "stylesheets/app.scss"
    ],

    // Copy over the whole directory to the build destination.
    "images/": "images/"
  }
}
```

This configuration describes "targets" (left hand side) with files, folders and arrays of files that make up the targets' contents (right hand side). Each target will be produced by processing the files on the right hand side based on their file extension, concatenating the results together and then saving the resultant file (the target) into the build destination. Where a string is specified on the right hand side instead of an array, that file will be processed, if needed, and then copied over directly. If the string ends in a "/", it will be interpreted as a directory and the directory will be copied over without further processing. All paths specified on the right hand side are relative to the `app/` directory.

You can change this configuration and directory structure at any time. You aren't required to have a `javascripts` and `stylesheets` directory, for example, but make sure you edit your configuration accordingly.

**Special note:** If you want the default builder to bootstrap your application on the frontend, make sure you have a build target called `app.js` which the default builder can append code to. It will not bootstrap your application with any other filename.

# Command

To build your frontend, simply run:

```none
$ truffle build
```

# Build Artifacts

Your build artifacts are saved within the `./build` directory, along side compiled deployed contract artifacts in `./build/contracts`.

# Considerations

The default builder is easy to use for most projects, and allows you to quickly get started. However, it has some drawbacks:

* It doesn't currently support `import`, `require`, etc., provided to you by tools like Browserify, Webpack, and CommonJS, making dependency management harder than it should be.
* It's a custom build system and doesn't easily integrate with other popular build systems.
* It is extensible, but again, using custom methods and APIs.

The default builder will likely be deprecated and replaced in future versions of Truffle, but it remains the default to continue to support dapps previously built on top of it. Truffle provides many ways for you to switch to a different build process, however, and you can find many examples in the [advanced build processes](/advanced/build_processes) section.

<script>
  (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
  })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

  ga('create', 'UA-83874933-1', 'auto');
  ga('send', 'pageview');
</script>
