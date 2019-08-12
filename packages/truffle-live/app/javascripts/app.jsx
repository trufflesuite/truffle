import "../stylesheets/app.scss";

import React, {Component} from "react";
import ReactDOM from "react-dom";

import TruffleTerminal from "./TruffleTerminal.jsx";


class App extends Component {
  render() {
    return (
      <div className="app">
        <h1>Truffle Live</h1>
        <h2>100% in-browser Truffle + Ganache</h2>  
        <TruffleTerminal preamble="Welcome to Truffle Live. Start by typing `truffle init`!"/>
        <ul>
          <li>Runs completely in the browser - no server components!</li>
          <li>Only downloads the Truffle binary once it's needed</li>
          <li>Integrates with Truffle's CompilerSupplier to download Solidity</li>
          <li>Uses the browser's local storage to store the filesystem, saving data for future use</li>
          <li>Includes useful commands like ls, cd, pwd and cat for inspecting the filesystem.</li>
        </ul>
      </div> 
    );
  }
}

window.onload = function() {
  ReactDOM.render(<App/>, document.getElementById('main'));
};
