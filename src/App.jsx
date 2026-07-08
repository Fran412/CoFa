import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Signup from './pages/Signup'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Storefront from './pages/Storefront'
import ProductPage from './pages/ProductPage'
import Landing from './pages/Landing'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/store/:slug" element={<Storefront />} />
        <Route path="/store/:slug/product/:productId" element={<ProductPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
