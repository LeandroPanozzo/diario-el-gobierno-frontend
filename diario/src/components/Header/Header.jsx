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
        { nombre: 'Estados Unidos', path: 'estados_unidos' },
        { nombre: 'Politica Exterior', path: 'politica_exterior' },
        { nombre: 'Medio Oriente', path: 'medio_oriente' },
        { nombre: 'Asia', path: 'asia' },
        { nombre: 'Internacional', path: 'internacional' },
      ],
    },
    {
      nombre: 'Revista Sociedad',
      path: 'https://diarioelgobierno.pe/revista-sociedad-lifestyle/',
      external: true,
      subcategorias: [],
    },
    {
      nombre: 'Noticias Pasadas',
      path: 'https://iky.b07.myftpupload.com/',
      external: true,
      subcategorias: [],
    },
  ];

  useEffect(() => {
    const accessToken = localStorage.getItem('access');
    const storedUserData = localStorage.getItem('user');
    
    if (accessToken) {
      if (storedUserData) {
        // Parse and set user data from local storage
        const parsedUserData = JSON.parse(storedUserData);
        setUser(parsedUserData);
      }
      
      fetchUserProfile();  // Sin pasar el accessToken como parámetro
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

  const fetchUserProfile = async () => {
    try {
      const response = await api.get('user-profile/');
      
      // preservamos el status trabajador del local storage si existe
      const storedUserData = JSON.parse(localStorage.getItem('user') || '{}');
      
      // Update user context con profile data 
      const updatedUserData = { 
        ...response.data,
        trabajador: storedUserData.trabajador ?? response.data.trabajador ?? false 
      };
      
      // guardamos en local storage para perisistir el status
      localStorage.setItem('user', JSON.stringify(updatedUserData));
      
      setUser(updatedUserData);
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
  
  // Componente de iconos sociales con imagenes en botones redondeados
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
        aria-label="Instagram"
      >
       <i className="ri-twitter-x-line"></i>
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
          <i className="ri-user-line"></i> Iniciar sesión
        </Link>
        <Link
          to="/register"
          className="button-common"
          onClick={() => setIsMenuOpen(false)}
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