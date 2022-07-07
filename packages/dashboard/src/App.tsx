// Wrappers
import MantineWrapper from "src/components/wrappers/MantineWrapper";
import ColorSchemeWrapper from "src/components/wrappers/ColorSchemeWrapper";
// Router
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
// Components
import Layout from "src/components/Layout";
import Txs from "src/components/Txs";
import Contracts from "src/components/Contracts";
import OpenSans from "src/components/fonts/OpenSans";
import Palette from "src/components/Palette";

function App(): JSX.Element {
  return (
    <div id="app">
      <ColorSchemeWrapper>
        <OpenSans />
        <MantineWrapper>
          <BrowserRouter>
            {/*  Everything maps to /txs except for /contracts  */}
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Navigate to="/txs" replace />} />
                <Route path="txs" element={<Txs />} />
                <Route path="contracts" element={<Contracts />} />
              </Route>
              <Route path="colors" element={<Palette />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </MantineWrapper>
      </ColorSchemeWrapper>
    </div>
  );
}

export default App;
