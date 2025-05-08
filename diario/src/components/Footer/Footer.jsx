import React from "react";
import "./Footer.css";

function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          {/* Sobre el Diario */}
          <div className="footer-section">
            <h3>Sobre Diario El Gobierno</h3>
            <p>
              Diario El Gobierno es un medio de comunicación digital que posee
              como principal objetivo proporcionar información a la esfera
              pública sobre la coyuntura nacional e internacional.
            </p>
          </div>

          {/* Equipo Editorial */}
          <div className="footer-section">
            <h3>Equipo Editorial</h3>
            <ul>
              <li>Director periodístico: Francisco Sanz Specogna</li>
              <li>Coordinador de edición: Santiago Ragaglia</li>
              <li>Coordinadores de redacción: Pablo Fiotto Berardi e Ivan Nelegatti</li>
              <li>Editor de la revista “Sociedad”: Gabriel Bernal Gallegos</li>
              <li>Subeditor de la revista “Sociedad”: Juan Cárdenas</li>
            </ul>
          </div>

          {/* Redes Sociales */}
          <div className="footer-section">
            <h3>Redes Sociales</h3>
            <div className="social-icons">
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
          </div>
        
          {/* Contacto - Nueva sección */}
          <div className="footer-section">
            <h3>Contacto</h3>
            <ul>
              <li>
                <a href="mailto:diarioelgobiernoargentina@gmail.com" style={{color: '#333'}}>
                  diarioelgobiernoargentina@gmail.com
                </a>
              </li>
              
            </ul>
          </div>
        </div>

        {/* Información Adicional */}
        <div className="footer-info">
          <p>Director: Juan Pablo Bernal Gallegos |</p>
          <p>ISSN (ElGobierno)</p>
          <p>Propietario: S. A. ElGobierno</p>
          <p>Copyright 2024 S.A. ElGobierno | Todos los derechos reservados.</p>
          <p>Queda prohibida la reproducción total o parcial del presente diario.</p>
          <p>Página creada por el equipo de programación de El Gobierno Argentina:</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
