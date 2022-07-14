// Wrappers
import MantineWrapper from "src/components/wrappers/MantineWrapper";
import ColorSchemeWrapper from "src/components/wrappers/ColorSchemeWrapper";
import WagmiWrapper from "src/components/wrappers/WagmiWrapper";
import { DashProvider } from "src/contexts/DashContext";
// Router
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
// Components
import Layout from "src/components/composed/Layout";
import Txs from "src/components/composed/Txs";
import Contracts from "src/components/composed/Contracts";
import Palette from "src/components/composed/Palette";
import MantineGlobal from "src/components/MantineGlobal";

function App(): JSX.Element {
  return (
    <div id="app">
      <ColorSchemeWrapper>
        <MantineGlobal />
        <MantineWrapper>
          <WagmiWrapper>
            <DashProvider>
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
                {/*    */}
              </BrowserRouter>
            </DashProvider>
          </WagmiWrapper>
        </MantineWrapper>
      </ColorSchemeWrapper>
    </div>
  );
}

export default App;
