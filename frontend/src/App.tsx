import { BrowserRouter, HashRouter, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import Gist from './components/Gist';
import './App.css';
import { config } from './config';

const Router = config.USE_HASH_ROUTER ? HashRouter : BrowserRouter;

function App() {
  return (
    <Router basename={config.BASE_PATH}>
      <Routes>
        <Route path="/" element={<Home />} />
        {/* Placeholder for future backend-backed gists */}
        <Route path="/gist/:id" element={<Gist />} />
      </Routes>
    </Router>
  );
}

export default App;
