import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

window.devLog = (...data) => {
  process.env.NODE_ENV === "development" && console.debug(...data);
};

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
