Contributing to Truffle
=======================

_Thanks for taking the time to help out and improve Truffle! :tada:_

The following is a set of guidelines for Truffle contributions and may change
over time. Feel free to suggest improvements to this document in a pull request!

Contents
--------

[How Can I Contribute?](#how-can-i-contribute)

[Development](#development)
  - [Overview](#overview)
  - [Development Requirements](#development-requirements)
  - [Getting Started](#getting-started)
  - [Forks, Branches, and Pull Requests](#forks-branches-and-pull-requests)
    - [Branching Model](#branching-model)
    - [Branching From Develop](#branching-from-develop)
    - [Tracking Forks Locally](#tracking-forks-locally)
    - [Working on a Branch](#working-on-a-branch)
    - [Changes Spanning Multiple Repos](#changes-spanning-multiple-repos)

[Additional Notes](#additional-notes)


How Can I Contribute?
---------------------

All contributions are welcome!

If you run into an issue, the first step is to reach out in our [Gitter channel](https://gitter.im/ConsenSys/truffle),
in case others have run into the problem or know how to help.

To report a problem or to suggest a new feature, [open a GitHub Issue](https://github.com/trufflesuite/truffle/issues/new).
This will help the Truffle maintainers become aware of the problem and prioritize
a fix.

For code contributions, for either new features or bug fixes, see [Development](#development).

If you're looking to make a substantial change, you may want to reach out first
to give us a heads up.


Development
-----------

### Overview

Truffle is organized as a collection of repositories, each with their own
NPM package.

This repository ([trufflesuite/truffle](https://github.com/trufflesuite/truffle))
is a distribution package and only contains logic to build Truffle for release.

The main development repository is [trufflesuite/truffle-core](https://github.com/trufflesuite/truffle-core),
containing the command-line interface (CLI) and some core logic. Other Truffle
repositories are included via dependencies specified in
[`truffle-core`'s package.json](https://github.com/trufflesuite/truffle-core/blob/master/package.json)

Truffle uses [meta](https://github.com/mateodelnorte/meta) to help manage
changes across multiple repositories.

### Development Requirements

In order to develop Truffle, you'll need:

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org)
- [Meta](https://github.com/mateodelnorte/meta) (install with `npm install -g meta`)


### Getting Started

First clone this repository and install NPM dependencies:

    $ git clone git@github.com:trufflesuite/truffle.git
    $ cd truffle
    $ npm install


Use `meta` to obtain the rest of the Truffle repositories:

    $ meta git update
    $ meta npm install

Your local Truffle copy will now contain a `dependencies/` directory, with all
the other Truffle repos located there.

You'll want to link these repositories to each other, so that changes you make
in one package are used by the others:

    $ meta npm symlink

(For instance, if you make a change to `truffle-migrate`, it will be used by
`truffle-core`)

**Note for Windows Users**: Default permissions prevent users from making symbolic
links. You may need to run your shell as an administrator, or change your policy
settings. See this [Superuser StackExchange answer](https://superuser.com/questions/104845/permission-to-make-symbolic-links-in-windows-7) for more information.

### Forks, Branches, and Pull Requests

Community contributions to Truffle require that you first fork the
repositor(y|ies) you are modifying. After your modifications, push changes to
your fork(s) and submit a pull request upstream to `trufflesuite`'s fork(s).

See GitHub documentation about [Collaborating with issues and pull requests](https://help.github.com/categories/collaborating-with-issues-and-pull-requests/)
for more information.

> :exclamation: **Note:** _Truffle development uses a long-lived `develop` branch for new (non-hotfix)
> development. Pull Requests should be opened against `develop` in all
> repositories. See [Branching from Develop](#branching-from-develop)._

#### Branching Model

Truffle projects maintain two stable branches:

  - **`master`**, for latest full releases and work targeting a patch release
  - **`develop`**, for latest unstable releases and work targeting the next major
      or minor release.

#### Branching From Develop

Check-out `develop` in all Truffle repositories with the following `meta`
command:

    $ meta pkgs checkout truffle:develop

If you've used `develop` before, you may need to pull changes:

    $ meta git pull

If dependencies have changed, you may need to install and re-link dependencies:

    $ meta npm install
    $ meta npm symlink


#### Tracking Forks Locally

For each forked repository you are making modifications to
(e.g. GitHub username **@ChocolateLover** modifying `truffle-artifactor`):

    $ cd dependencies/truffle-artifactor
    $ git remote add ChocolateLover git@github.com:ChocolateLover/truffle-artifactor.git
    $ git fetch --all

#### Working on a Branch

Use a branch for your modifications, tracking it on your fork:

    $ git checkout -b sweet-feature
    $ git push -u ChocolateLover sweet-feature

Then, make changes and commit as usual.

#### Changes Spanning Multiple Repos

For changes spanning multiple repositories, it may help to use the same branch
name for each.

If you need to switch between branches, you can use the `meta pkgs` plugin
([readme](https://github.com/trufflesuite/meta-pkgs/blob/master/README.md)) to checkout en-masse:

    $ meta pkgs checkout truffle:develop truffle:ChocolateLover/sweet-feature --greedy

This will checkout `sweet-feature` from **@ChocolateLover**'s fork for all projects,
falling back to `develop`.


Additional Notes
----------------

Join the chat in our [Gitter channel](https://gitter.im/ConsenSys/truffle). If anything about this
process is unclear, or for helpful feedback of any kind, we'd love to hear from you!

**Thanks again for all your support, encouragement, and effort! Truffle would not
be possible without contributors like you. :bow:**
