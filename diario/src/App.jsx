import '@fontsource/roboto-slab';  // Importa la fuente

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';
import DiarioHome from './pages/home/home';
import Login from './pages/auth/login';
import {Register } from './pages/auth/register';
import Rol from './pages/workers/rol';
import Trabajadores from './pages/workers/Trabajadores'
import NewsArticleEditor from './pages/news/NewsArticleEditor';
import { UserProvider } from './pages/context/UserContext';
import { EditNewsContent } from './components/EditNewsContent/EditNewsContent';
import NewsDetailPage from './components/News/NewsDetailPage';
import SectionPage from './components/Sections/SectionPage';
import SubcategoryPage from './components/Sections/SubcategoryPage'
import TagPage from './components/Sections/TagPage';
import CommentsPage from './pages/comments/CommentsPage';
import TrabajadorProfile from './components/Trabajador/TrabajadorProfile';
import UserProfile from './components/User/UserProfile';
import TrabajadorNoticias from './components/Trabajador/TrabajadorNoticias';
import TerminosYCondiciones from './pages/legal/TerminosYCondiciones';
import ComoAnunciar from './pages/instrucciones/ComoAnunciar';

function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <Header />
        <Routes>
          <Route path="/" element={<Navigate to="/home" />} />
          <Route path="/home" element={<DiarioHome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/rol" element={<Rol />} />
          <Route path="/ed" element={<NewsArticleEditor />} />
          <Route path="/trabajadores" element={<Trabajadores />} />
          <Route path="/edit-content/:id" element={<EditNewsContent />} />
          <Route path="/noticia/:id" element={<NewsDetailPage />} />
          <Route path="/seccion/:sectionName" element={<SectionPage />} />
          <Route path="/subcategoria/:subcategory" element={<SubcategoryPage />} /> {/* Nueva ruta */}
          <Route path="/tag/:tagName" element={<TagPage />} />
          <Route path="/comments/:id" element={<CommentsPage />} />
          <Route path="/usuario/profile" element={<UserProfile />} />
          <Route path="/trabajador/:trabajadorId" element={<TrabajadorProfile />} />
          <Route path="/trabajador/:trabajadorId/noticias" element={<TrabajadorNoticias />} />
          <Route path="/terminos-y-condiciones" element={<TerminosYCondiciones />} />
          <Route path="/anunciar" element={<ComoAnunciar />} />
        </Routes>
        <Footer />
      </BrowserRouter>
    </UserProvider>
  );
}

export default App;