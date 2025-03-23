import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../../pages/context/UserContext';
import './Header.css';
import logo from '../../assets/images/EG 1.jpg';
import axios from 'axios'; // Import your axios instance

function Header() {
  const { user, setUser, logout } = useUser(); // Use the logout function from context
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();

  // Definir las categorías y subcategorías
  const categorias = [
    {
      nombre: 'Portada',
      path: 'Portada',
      subcategorias: [],
    },
    {
      nombre: 'Politica',
      path: 'Politica',
      subcategorias: [
        { nombre: 'Legislativos', path: 'legislativos' },
        { nombre: 'Judiciales', path: 'judiciales' },
        { nombre: 'Conurbano', path: 'conurbano' },
        { nombre: 'Provincias', path: 'provincias' },
        { nombre: 'Municipios', path: 'municipios' },
        { nombre: 'Protestas', path: 'protestas' },
      ],
    },
    {
      nombre: 'Economia',
      path: 'Economia',
      subcategorias: [
        { nombre: 'Finanzas', path: 'finanzas' },
        { nombre: 'Negocios', path: 'negocios' },
        { nombre: 'Empresas', path: 'empresas' },
        { nombre: 'Dolar', path: 'dolar' },
      ],
    },
    {
      nombre: 'Cultura',
      path: 'Cultura',
      subcategorias: [
        { nombre: 'Cine', path: 'cine' },
        { nombre: 'Literatura', path: 'literatura' },
        { nombre: 'Moda', path: 'moda' },
        { nombre: 'Tecnologia', path: 'tecnologia' },
        { nombre: 'Eventos', path: 'eventos' },
      ],
    },
    {
      nombre: 'Mundo',
      path: 'Mundo',
      subcategorias: [
        { nombre: 'Argentina', path: 'argentina' },
        { nombre: 'China', path: 'china' },
        { nombre: 'Estados Unidos', path: 'estados_unidos' },
        { nombre: 'Brasil', path: 'brasil' },
        { nombre: 'America', path: 'america' },
        { nombre: 'Latinoamerica', path: 'latinoamerica' },
        { nombre: 'Asia', path: 'asia' },
        { nombre: 'Africa', path: 'africa' },
        { nombre: 'Oceanía', path: 'oceania' },
        { nombre: 'Antartida', path: 'antartica' },
        { nombre: 'Internacional', path: 'internacional' },
        { nombre: 'Seguridad', path: 'seguridad' },
        { nombre: 'Comercio', path: 'comercio' },
        { nombre: 'Guerra', path: 'guerra' },
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
    if (accessToken) {
      fetchUserProfile(accessToken);
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

  const fetchUserProfile = async (accessToken) => {
    try {
      const response = await fetch('http://localhost:8000/diarioback/user-profile/', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
  
      if (!response.ok) throw new Error('Error fetching user profile');
  
      const data = await response.json();
      // Update user context with profile data
      // Asegúrate de que 'trabajador' se incluya en el objeto user
      setUser(prevUser => ({ 
        ...prevUser, 
        ...data,
        trabajador: data.trabajador || false // Asegurarse que exista la propiedad
      }));
    } catch (error) {
      console.error(error);
      handleLogout();
    }
  };

  const handleLogout = () => {
    // Clear all auth data
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };
  
  // Componente de iconos sociales con imágenes en botones redondeados
  const SocialIcons = () => (
    <div className="social-icons-container">
      <a
        href="https://www.linkedin.com"
        target="_blank"
        rel="noopener noreferrer"
        className="social-button"
        aria-label="LinkedIn"
      >
        <img 
          src="/icons/linkedinheader.png" 
          alt="" 
          className="social-icon-img" 
        />
      </a>
      <a
        href="https://www.instagram.com"
        target="_blank"
        rel="noopener noreferrer"
        className="social-button"
        aria-label="Instagram"
      >
        <img 
          src="/icons/instagramheader.png" 
          alt="" 
          className="social-icon-img" 
        />
      </a>
      <a
        href="https://x.com"
        target="_blank"
        rel="noopener noreferrer"
        className="social-buttonx"
        aria-label="Twitter/X"
      >
        <img 
          src="/icons/xheader.png" 
          alt="" 
          className="social-icon-img" 
        />
      </a>
    </div>
  );

  const renderAuthLinks = () => (
    user ? (
      <>
        <button
          className="button-common"
          onClick={() => {
            handleLogout();
            setIsMenuOpen(false);
          }}
        >
          Cerrar sesión
        </button>
        <Link
          to={user.trabajador ? "/trabajador/profile" : "/usuario/profile"}
          className="button-common"
          onClick={() => setIsMenuOpen(false)}
        >
          {user.trabajador ? "Perfil" : "Perfil de usuario"}
        </Link>
      </>
    ) : (
      <>
        <Link
          to="/login"
          className="button-common"
          onClick={() => setIsMenuOpen(false)}
        >
          Iniciar sesión
        </Link>
        <Link
          to="/register"
          className="button-common"
          onClick={() => setIsMenuOpen(false)}
        >
          Registrarse
        </Link>
      </>
    )
  );

  return (
    <>
      <div className="header-spacer" />
      <header className={`header ${isScrolled ? 'scrolled' : ''}`}>
        <div className="container">
          <div className="header-content">
            <Link to="/home" className="logo">
              <img src={logo} alt="Logo Diario El Gobierno" className="logo-image" />
              DIARIO EL GOBIERNO
            </Link>

            <button 
              className="hamburger-button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? '✕' : '☰'}
            </button>
          </div>

          <div className="sections-container">
            <nav className="nav-menu">
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
            </nav>

            <div 
              className={`mobile-menu-overlay ${isMenuOpen ? 'open' : ''}`}
              onClick={() => setIsMenuOpen(false)}
            />

            <nav className={`navv-menu ${isMenuOpen ? 'open' : ''}`}>
              {categorias.map((categoria) => (
                categoria.external ? (
                  <a
                    key={categoria.path}
                    href={categoria.path}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsMenuOpen(false)}
                    className="mobile-section-link"
                  >
                    {categoria.nombre}
                  </a>
                ) : (
                  <div key={categoria.path} className="mobile-section-with-subcategorias">
                    <Link
                      to={`/seccion/${categoria.path}`}
                      onClick={() => setIsMenuOpen(false)}
                      className="mobile-section-link"
                    >
                      {categoria.nombre}
                    </Link>
                    {categoria.subcategorias.length > 0 && (
                      <div className="mobile-subcategorias">
                        {categoria.subcategorias.map((subcat) => (
                          <Link
                          key={subcat.path}
                          to={`/subcategoria/${subcat.path}`}
                          onClick={() => setIsMenuOpen(false)}
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

          <div className="header-actions">
            <SocialIcons />
            <div className="header-buttons">
              {renderAuthLinks()}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}

export default Header;