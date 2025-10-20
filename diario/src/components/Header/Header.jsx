import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../../pages/context/UserContext';
import './Header.css';
import logo from '../../assets/images/EG 1.jpg';
import api from '../../pages/context/axiosConfig';

function Header() {
  const { user, setUser, logout } = useUser();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  // Definir las categorías y subcategorías
  const categorias = [
    {
      nombre: 'Politica',
      path: 'Politica',
      subcategorias: [
        { nombre: 'Legislativos', path: 'legislativos' },
        { nombre: 'Policiales', path: 'policiales' },
        { nombre: 'Elecciones', path: 'elecciones' },
        { nombre: 'Gobierno', path: 'gobierno' },
        { nombre: 'Provincias', path: 'provincias' },
        { nombre: 'Capital', path: 'capital' },
        { nombre: 'Nacion', path: 'nacion' },
      ],
    },
    {
      nombre: 'Economia',
      path: 'Economia',
      subcategorias: [
        { nombre: 'Finanzas', path: 'finanzas' },
        { nombre: 'Comercio internacional', path: 'comercio_internacional' },
        { nombre: 'Politica economica', path: 'politica_economica' },
        { nombre: 'Pobreza e inflacion', path: 'pobreza_e_inflacion' },
        { nombre: 'Dolar', path: 'dolar' },
      ],
    },
    {
      nombre: 'Cultura',
      path: 'Cultura',
      subcategorias: [
        { nombre: 'Cine', path: 'cine' },
        { nombre: 'Literatura', path: 'literatura' },
        { nombre: 'Salud', path: 'salud' },
        { nombre: 'Tecnologia', path: 'tecnologia' },
        { nombre: 'Eventos', path: 'eventos' },
        { nombre: 'Educacion', path: 'educacion' },
        { nombre: 'Efemerides', path: 'efemerides' },
        { nombre: 'Deporte', path: 'deporte' },
      ],
    },
    {
      nombre: 'Mundo',
      path: 'Mundo',
      subcategorias: [
        { nombre: 'Estados Unidos', path: 'estados_unidos' },
        { nombre: 'Medio Oriente', path: 'medio_oriente' },
        { nombre: 'Asia', path: 'asia' },
        { nombre: 'Internacional', path: 'internacional' },
        { nombre: 'Latinoamerica', path: 'latinoamerica' },
      ],
    },
    {
      nombre: 'Tipos de notas',
      path: 'Tipos de notas',
      subcategorias: [
        { nombre: 'De analisis', path: 'de_analisis' },
        { nombre: 'De opinion', path: 'de_opinion' },
        { nombre: 'Informativas', path: 'informativas' },
        { nombre: 'Entrevistas', path: 'entrevistas' },
      ],
    },
    {
      nombre: 'Revista Sociedad',
      path: 'https://diarioelgobierno.pe/revista-sociedad-lifestyle/',
      external: true,
      subcategorias: [],
    },
  ];

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

  // Cerrar búsqueda al hacer scroll
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

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('user');
    setUser(null);
    setIsMenuOpen(false);
    navigate('/login');
  };

  // Función para manejar la búsqueda
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/buscar?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
      setSearchQuery('');
      setIsMenuOpen(false);
    }
  };

  // Función para cerrar la búsqueda al hacer clic fuera
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

  const toggleDropdown = (index) => {
    setActiveDropdown(activeDropdown === index ? null : index);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
    setActiveDropdown(null);
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
          {/* Parte superior con logo centrado y todo a la derecha */}
          <div className="header-top">
            {/* Logo centrado */}
            <Link to="/home" className="logo" onClick={closeMenu}>
              <img src={logo} alt="Logo Diario El Gobierno" className="logo-image" />
              DIARIO EL GOBIERNO
            </Link>
            
            {/* Contenedor DERECHO (redes sociales + botones) */}
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

          {/* Navegación centrada debajo del logo con búsqueda a la derecha */}
          <nav className="nav-menu">
            <div className="nav-links">
              {categorias.map((categoria) => (
                categoria.external ? (
                  <a
                    key={categoria.path}
                    href={categoria.path}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {categoria.nombre}
                  </a>
                ) : (
                  <div key={categoria.path} className="section-with-subcategorias">
                    <Link
                      to={`/seccion/${categoria.path}`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {categoria.nombre}
                    </Link>
                    {categoria.subcategorias.length > 0 && (
                      <div className="subcategorias">
                        {categoria.subcategorias.map((subcat) => (
                          <Link
                            key={subcat.path}
                            to={`/subcategoria/${subcat.path}`}
                            onClick={() => setIsMenuOpen(false)}
                          >
                            {subcat.nombre}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )
              ))}
            </div>
            
            {/* Botón de búsqueda a la derecha de las secciones */}
            <div className="nav-search-button">
              <SearchButton />
            </div>
          </nav>

          {/* Barra de búsqueda */}
          <SearchBar />

          {/* Menú móvil */}
          <div 
            className={`mobile-menu-overlay ${isMenuOpen ? 'open' : ''}`}
            onClick={closeMenu}
          />

          <nav className={`navv-menu ${isMenuOpen ? 'open' : ''}`}>
            {/* Barra de búsqueda móvil */}
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

            {categorias.map((categoria, index) => (
              categoria.external ? (
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
              ) : (
                <div key={categoria.path} className="mobile-section-with-subcategorias">
                  <div 
                    className="mobile-section-link"
                    onClick={() => toggleDropdown(index)}
                    style={{cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}
                  >
                    <span>{categoria.nombre}</span>
                    {categoria.subcategorias.length > 0 && (
                      <span>{activeDropdown === index ? '▲' : '▼'}</span>
                    )}
                  </div>
                  {categoria.subcategorias.length > 0 && (
                    <div className={`mobile-subcategorias ${activeDropdown === index ? 'open' : ''}`}>
                      {categoria.subcategorias.map((subcat) => (
                        <Link
                          key={subcat.path}
                          to={`/subcategoria/${subcat.path}`}
                          onClick={closeMenu}
                          className="mobile-subcategoria-link"
                        >
                          {subcat.nombre}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            ))}

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