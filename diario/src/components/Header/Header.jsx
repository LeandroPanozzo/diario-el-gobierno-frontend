import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../../pages/context/UserContext';
import './Header.css';
import logo from '../../assets/images/EG 1.jpg';
import api from '../../pages/context/axiosConfig';

function Header() {
  const { user, setUser, logout } = useUser();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTiposDropdown, setShowTiposDropdown] = useState(false);
  const dropdownTimeoutRef = useRef(null);
  const navigate = useNavigate();

  // Subcategorías solo para "Tipos de notas"
  const tiposDeNotasSubcategorias = [
    { nombre: 'De análisis', path: 'de_analisis' },
    { nombre: 'De opinión', path: 'de_opinion' },
    { nombre: 'Informativas', path: 'informativas' },
    { nombre: 'Entrevistas', path: 'entrevistas' },
  ];

  // Categorías principales (solo enlaces directos excepto Tipos de notas)
  const categorias = [
    {
      nombre: 'Politica',
      path: 'Politica',
    },
    {
      nombre: 'Economia',
      path: 'Economia',
    },
    {
      nombre: 'Cultura',
      path: 'Cultura',
    },
    {
      nombre: 'Mundo',
      path: 'Mundo',
    },
    {
      nombre: 'Tipos de notas',
      path: 'Tipos de notas',
      hasDropdown: true,
    },
    {
      nombre: 'Revista Sociedad',
      path: 'https://diarioelgobierno.pe/revista-sociedad-lifestyle/',
      external: true,
    },
  ];

  // Funciones para manejar el delay del dropdown
  const handleMouseEnter = () => {
    // Cancelar cualquier timeout pendiente
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
    }
    setShowTiposDropdown(true);
  };

  const handleMouseLeave = () => {
    // Agregar un delay de 300ms antes de ocultar el dropdown
    dropdownTimeoutRef.current = setTimeout(() => {
      setShowTiposDropdown(false);
    }, 300);
  };

  // Limpiar timeout al desmontar el componente
  useEffect(() => {
    return () => {
      if (dropdownTimeoutRef.current) {
        clearTimeout(dropdownTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const accessToken = localStorage.getItem('access');
    const storedUserData = localStorage.getItem('user');
    
    if (accessToken) {
      if (storedUserData) {
        const parsedUserData = JSON.parse(storedUserData);
        setUser(parsedUserData);
      }
      fetchUserProfile();
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 50;
      setIsScrolled(scrolled);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isSearchOpen) {
      setIsSearchOpen(false);
    }
  }, [isScrolled]);

  const fetchUserProfile = async () => {
    try {
      const response = await api.get('user-profile/');
      const storedUserData = JSON.parse(localStorage.getItem('user') || '{}');
      const updatedUserData = { 
        ...response.data,
        trabajador: storedUserData.trabajador ?? response.data.trabajador ?? false 
      };
      localStorage.setItem('user', JSON.stringify(updatedUserData));
      setUser(updatedUserData);
    } catch (error) {
      console.error(error);
      handleLogout();
    }
  };

  const clearAllCache = async () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      
      document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
      });
      
      if ('caches' in window) {
        try {
          const cacheNames = await caches.keys();
          await Promise.all(
            cacheNames.map(cacheName => caches.delete(cacheName))
          );
        } catch (error) {
          console.log('Error al borrar Cache API:', error);
        }
      }
      
      console.log('Caché y datos borrados exitosamente');
    } catch (error) {
      console.error('Error al borrar el caché:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await clearAllCache();
      
      localStorage.removeItem('access');
      localStorage.removeItem('refresh');
      localStorage.removeItem('user');
      localStorage.removeItem('trabajadorId');
      
      setUser(null);
      setIsMenuOpen(false);
      navigate('/login');
      
      console.log('Sesión cerrada y datos limpiados exitosamente');
    } catch (error) {
      console.error('Error durante el logout:', error);
      localStorage.clear();
      sessionStorage.clear();
      setUser(null);
      navigate('/login');
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/buscar?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
      setSearchQuery('');
      setIsMenuOpen(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isSearchOpen && !event.target.closest('.search-container')) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSearchOpen]);

  const closeMenu = () => {
    setIsMenuOpen(false);
    setShowTiposDropdown(false);
  };
  
  const SocialIcons = () => (
    <div className="social-icons-container">
      <a
        href="https://www.linkedin.com/company/diario-el-gobierno-ar/posts/?feedView=all"
        target="_blank"
        rel="noopener noreferrer"
        className="social-button"
        aria-label="LinkedIn"
      >
        <i className="ri-linkedin-fill"></i>
      </a>
      <a
        href="https://www.instagram.com/diarioelgobierno.ar/"
        target="_blank"
        rel="noopener noreferrer"
        className="social-button"
        aria-label="Instagram"
      >
       <i className="ri-instagram-line"></i>
      </a>
      <a
        href="https://x.com/elgobierno_ar?t=_1gDxj8kEbKcuTXMOarWgA&s=08"
        target="_blank"
        rel="noopener noreferrer"
        className="social-button"
        aria-label="Twitter"
      >
       <i className="ri-twitter-x-line"></i>
      </a>
    </div>
  );

  const SearchButton = () => (
    <button
      className="search-button"
      onClick={() => setIsSearchOpen(!isSearchOpen)}
      aria-label="Buscar noticias"
    >
      <i className="ri-search-line"></i>
    </button>
  );

  const SearchBar = () => (
    <div className={`search-container ${isSearchOpen ? 'open' : ''}`}>
      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          placeholder="Buscar noticias..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
          autoFocus
        />
        <button type="submit" className="search-submit">
          <i className="ri-search-line"></i>
        </button>
        <button
          type="button"
          className="search-close"
          onClick={() => setIsSearchOpen(false)}
          aria-label="Cerrar búsqueda"
        >
          <i className="ri-close-line"></i>
        </button>
      </form>
    </div>
  );

  const renderAuthLinks = () => (
    user ? (
      <>
        <Link
          to={user.trabajador ? "/trabajador/profile" : "/usuario/profile"}
          className="button-common"
          onClick={closeMenu}
        >
          <i className="ri-user-line"></i> {user.trabajador ? "Perfil" : "Perfil"}
        </Link>
        <button
          className="button-common"
          onClick={handleLogout}
        >
          Cerrar sesión
        </button>
      </>
    ) : (
      <>
        <Link
          to="/login"
          className="button-common"
          onClick={closeMenu}
        >
          <i className="ri-user-line"></i> Iniciar sesión
        </Link>
        <Link
          to="/register"
          className="button-common"
          onClick={closeMenu}
        >
          <i className="ri-user-line"></i> Registrarse
        </Link>
      </>
    )
  );

  return (
    <>
      <div className="header-spacer" />
      <header className={`header ${isScrolled ? 'scrolled' : ''}`}>
        <div className="container">
          <div className="header-top">
            <Link to="/home" className="logo" onClick={closeMenu}>
              <img src={logo} alt="Logo Diario El Gobierno" className="logo-image" />
              DIARIO EL GOBIERNO
            </Link>
            
            <div className="header-right">
              <div className="header-actions">
                <div className="social-icons-wrapper">
                  <SocialIcons />
                </div>
                <div className="header-buttons">
                  {renderAuthLinks()}
                </div>
              </div>
            </div>

            <button 
              className="hamburger-button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Menú"
            >
              {isMenuOpen ? '✕' : '☰'}
            </button>
          </div>

          {/* Navegación principal con dropdown solo en Tipos de notas */}

<nav className="nav-menu">
  <div className="nav-search-button">
    <SearchButton />
  </div>
  
  <div className="nav-links">
    {categorias.map((categoria) => {
      // Si es un enlace externo
      if (categoria.external) {
        return (
          <a
            key={categoria.path}
            href={categoria.path}
            target="_blank"
            rel="noopener noreferrer"
          >
            {categoria.nombre}
          </a>
        );
      }
      
      // Si tiene dropdown (Tipos de notas)
      if (categoria.hasDropdown) {
        return (
          <div 
            key={categoria.path}
            className="section-with-subcategorias"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <Link to={`/seccion/${categoria.path}`}>
              {categoria.nombre}
            </Link>
            
            {showTiposDropdown && (
              <div 
                className="subcategorias"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                {tiposDeNotasSubcategorias.map((sub) => (
                  <Link
                    key={sub.path}
                    to={`/subcategoria/${sub.path}`}
                    onClick={() => setShowTiposDropdown(false)}
                  >
                    {sub.nombre}
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      }
      
      // Enlace normal a sección
      return (
        <Link
          key={categoria.path}
          to={`/seccion/${categoria.path}`}
          onClick={() => setIsMenuOpen(false)}
        >
          {categoria.nombre}
        </Link>
      );
    })}
  </div>
</nav>

          <SearchBar />

          {/* Menú móvil */}
          <div 
            className={`mobile-menu-overlay ${isMenuOpen ? 'open' : ''}`}
            onClick={closeMenu}
          />

          <nav className={`navv-menu ${isMenuOpen ? 'open' : ''}`}>
            <div className="mobile-search-container">
              <h3 className="mobile-search-title">Buscar noticias</h3>
              <form onSubmit={handleSearch} className="mobile-search-form">
                <div className="mobile-search-wrapper">
                  <i className="ri-search-line mobile-search-icon"></i>
                  <input
                    type="text"
                    placeholder="¿Qué estás buscando?"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="mobile-search-input"
                  />
                </div>
                <button type="submit" className="mobile-search-submit">
                  Buscar
                </button>
              </form>
            </div>

            {/* Menú móvil con subcategorías expandibles solo para Tipos de notas */}
            {categorias.map((categoria) => {
              if (categoria.external) {
                return (
                  <a
                    key={categoria.path}
                    href={categoria.path}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={closeMenu}
                    className="mobile-section-link"
                  >
                    {categoria.nombre}
                  </a>
                );
              }
              
              if (categoria.hasDropdown) {
                return (
                  <div key={categoria.path}>
                    <div 
                      className="mobile-section-link mobile-section-with-dropdown"
                      onClick={() => setShowTiposDropdown(!showTiposDropdown)}
                    >
                      {categoria.nombre}
                      <i className={`ri-arrow-${showTiposDropdown ? 'up' : 'down'}-s-line`}></i>
                    </div>
                    
                    <div className={`mobile-subcategorias ${showTiposDropdown ? 'open' : ''}`}>
                      {tiposDeNotasSubcategorias.map((sub) => (
                        <Link
                          key={sub.path}
                          to={`/subcategoria/${sub.path}`}
                          onClick={closeMenu}
                          className="mobile-subcategoria-link"
                        >
                          {sub.nombre}
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              }
              
              return (
                <Link
                  key={categoria.path}
                  to={`/seccion/${categoria.path}`}
                  onClick={closeMenu}
                  className="mobile-section-link"
                >
                  {categoria.nombre}
                </Link>
              );
            })}

            <div className="mobile-social-icons">
              <SocialIcons />
            </div>

            <div className="mobile-auth-links">
              {renderAuthLinks()}
            </div>
          </nav>
        </div>
      </header>
    </>
  );
}

export default Header;