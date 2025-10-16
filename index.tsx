/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

const container = document.getElementById('root');
if (container) {
  const root = ReactDOM.createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
