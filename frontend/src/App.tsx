import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import Gist from './components/Gist';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        {/* Placeholder for future backend-backed gists */}
        <Route path="/gist/:id" element={<Gist />} />
      </Routes>
    </Router>
  );
}

export default App;
