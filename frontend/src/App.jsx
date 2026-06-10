import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Analytics from "./pages/Analytics";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/analytics/:code" element={<Analytics />} />
      </Routes>
    </BrowserRouter>
  );
}
