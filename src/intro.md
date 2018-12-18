_It's about to be 2019! Guess we won't be needing this anymore:_
> _**2018 New Year's Resolutions**_
> - [x] _Release Truffle v5_ :confetti_ball:
> - [ ] _Don't eat so much chocolate_ :chocolate_bar:

_Wait. That second one seems suspect. What is that?_ :woman_shrugging:

_Okay, from now on, Truffle's official stance on New Years' Resolutions is not
to let anything get in the way of a life of simple luxuries,
whether that means confectionary quantities bordering on "medically
ill-advised", or anything else similar to that, like what we have for you
today._


<details>
<summary><em>Just kidding...</em></summary>

That's always been the official stance.

<details>
<summary><em>But really...</em> </summary>

Please remember that healthy habits are a useful means of being able to
enjoy as much delicious chocolate for as many years as possible. :yum:

**Wishing you happy and restful holidays, and a merry 2019!** :snowflake:

</details>
</details>

---

**Presenting Truffle v5.0.0**! :postal_horn:

This major release is the **biggest Truffle release yet**, in terms of
the number of new features, the release notes word-count,
and most excitingly, the number of individual contributors from all around
the world.

To keep this introduction brief, this marks the end of the v5 beta series. We
hope you share our feelings when we say that we are truly impressed by the
scope of changes and the wonder at the possibilities ahead.

These release notes seek to cover the changes as completely as possible, but if
you're looking for historical information, it may be helpful to refer to
the release notes from the betas:
- [v5.0.0-beta.0 – Chocolate Sushi :sushi:](https://github.com/trufflesuite/truffle/releases/tag/v5.0.0-beta.0)
- [v5.0.0-beta.1 – Hazelnut Onigiri :rice_ball:](https://github.com/trufflesuite/truffle/releases/tag/v5.0.0-beta.1)
- [v5.0.0-beta.2 – Bento Box of Candy :bento:](https://github.com/trufflesuite/truffle/releases/tag/v5.0.0-beta.2)

Anyway, keep scrolling if you're looking for the [table of contents](#user-content-contents),
or first read about some highlights. :high_brightness:

---

### Highlights

Perhaps most notably, Truffle v5 now features:

- Improved **`async`/`await` support** everywhere we could manage:
  in **tests**, **migrations**, **`truffle exec` scripts**, presumably any
  love letters, **`truffle develop` / `truffle console`**, et cetera.

  Much of this is thanks to upgrading to [Web3.js v1.0](https://web3js.readthedocs.io/en/1.0/index.html),
  which paves the way with its vastly improved interface.

  Skip ahead to read about [Interacting with your contracts](#user-content-what-s-new-in-truffle-v5-interacting-with-your-contracts)
  or about [`async` Migrations](#user-content-what-s-new-in-truffle-v5-truffle-migrate-async-migrations).

- **"Bring your own compiler"** is an old name for a new feature that's been on
  the roadmap for a long time. Truffle v5 offers unprecedented flexibility in its
  support for compiler integrations. Besides the **native `solc` support** that
  the name implies, this includes support for **`solc` in Docker**,
  **automatically downloading `solc`** to match a specified version, an
  initial implementation of compatibility with the **Vyper programming language**,
  and an integration point for more advanced **arbitrary compilation workflows**.

  See the section on [`truffle compile`](#user-content-what-s-new-in-truffle-v5-truffle-compile)
  to learn more.

- A **sweet new migrations system** that gives you **tons of useful information**
  about your deployments, **automatic dry-runs**, and the ability to configure
  Truffle to **wait for transaction confirmations** or to
  **increase block timeouts**.

  More below about [`truffle migrate`](#user-content-what-s-new-in-truffle-v5-truffle-migrate).

- The **beginnings of a plugins system** with a new Truffle command:
  **`truffle run <external-plugin-command>`**.

  It's still early, so we'd love to solicit your feedback on this! This feature
  is intentionally minimal to start, so we'd appreciate your thoughts and
  ideas for it.

  See [`truffle run`](#user-content-what-s-new-in-truffle-v5-truffle-run)
  notes for more.

- **Opt-in usage analytics** :tada: to **make Truffle better**! Please consider
  enabling this by running:
  ```
  truffle config --enable-analytics
  ```

  **Real talk**: admittedly, we mention this here because we want you to see it.

  To make Truffle the best smart contract development tool it can be, good
  decisions about future updates rely on informed consideration. We promise to
  [limit the data](#user-content-what-s-new-in-truffle-v5-new-truffle-config-opt-in-analytics)
  we collect and thank you in advance for helping us adapt to and inform new best practices.

---

<p align="center">
:love_letter:
</p>

---
