import React, { Fragment } from "react";
import { render } from "react-dom";
import { links, content } from "./content";
import styles from "./styles.module.scss";

function App(): JSX.Element {
  return (
    <>
      <ul className={styles["links"]}>
        {links.map((C, i) => (
          <C key={i} />
        ))}
      </ul>
      <div className={styles["content"]}>
        <h1>@truffle/codec-components</h1>
        <p>
          <a href="https://hackmd.io/@cliffoo/rkZj17RJ2" target="_blank">
            Overview
          </a>
          ,&nbsp;
          <a href="https://hackmd.io/@cliffoo/ryukFtJeh" target="_blank">
            customization interface
          </a>
          . (Not up-to-date.)
        </p>
        <hr />
        {content.map((C, i) => (
          <Fragment key={i}>
            <C />
            {i < content.length - 1 && <hr />}
          </Fragment>
        ))}
      </div>
    </>
  );
}

render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById("root")
);
