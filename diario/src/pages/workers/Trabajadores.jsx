import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Trabajadores.css'; // Asegúrate de tener un archivo CSS para los estilos

const API_URL = 'http://localhost:8000/diarioback/trabajadores/';
const ROLES_URL = 'http://localhost:8000/diarioback/roles/';
const USERS_URL = 'http://localhost:8000/diarioback/users/'; // URL para usuarios

const Trabajadores = () => {
  const [trabajadores, setTrabajadores] = useState([]);
  const [nuevoTrabajador, setNuevoTrabajador] = useState({
    nombre: '',
    apellido: '',
    foto_perfil: '',
    foto_perfil_local: '', // Campo adicional si se utiliza una carga local
    rol: '',
    user: '', // El ID del usuario asociado
  });
  const [rols, setRols] = useState([]);
  const [usuarios, setUsuarios] = useState([]);

  useEffect(() => {
    // Cargar la lista de trabajadores, roles y usuarios
    const fetchData = async () => {
      try {
        const { data: trabajadoresData } = await axios.get(API_URL);
        setTrabajadores(trabajadoresData);

        const { data: rolsData } = await axios.get(ROLES_URL);
        setRols(rolsData);

        const { data: usuariosData } = await axios.get(USERS_URL);
        setUsuarios(usuariosData);
      } catch (error) {
        console.error('Error al cargar los datos', error);
      }
    };

    fetchData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNuevoTrabajador({ ...nuevoTrabajador, [name]: value });
  };

  const handleCreate = async () => {
    try {
        const formData = new FormData();
        formData.append('nombre', nuevoTrabajador.nombre);
        formData.append('apellido', nuevoTrabajador.apellido);
        formData.append('foto_perfil', nuevoTrabajador.foto_perfil);
        formData.append('foto_perfil_local', nuevoTrabajador.foto_perfil_local);
        // No se incluye el ID del rol en FormData en este caso
        formData.append('user', nuevoTrabajador.user);
        
        // Usar URL con parámetros de consulta
        const urlWithParams = `${API_URL}?rol=${nuevoTrabajador.rol}`;
        await axios.post(urlWithParams, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });

        // Código para limpiar formulario y recargar datos...
    } catch (error) {
        console.error('Error al crear el trabajador', error);
    }
};


  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_URL}${id}/`);
      // Recargar la lista de trabajadores
      const { data } = await axios.get(API_URL);
      setTrabajadores(data);
    } catch (error) {
      console.error('Error al eliminar el trabajador', error);
    }
  };

  return (
    <div className="trabajadores-container">
      <h1>Trabajadores</h1>
      <div className="create-form">
        <h2>Crear nuevo trabajador</h2>
        <input
          type="text"
          name="nombre"
          value={nuevoTrabajador.nombre}
          onChange={handleInputChange}
          placeholder="Nombre"
        />
        <input
          type="text"
          name="apellido"
          value={nuevoTrabajador.apellido}
          onChange={handleInputChange}
          placeholder="Apellido"
        />
        <input
          type="text"
          name="foto_perfil"
          value={nuevoTrabajador.foto_perfil}
          onChange={handleInputChange}
          placeholder="Foto de perfil (URL)"
        />
        <input
          type="file"
          name="foto_perfil_local"
          onChange={(e) => setNuevoTrabajador({ ...nuevoTrabajador, foto_perfil_local: e.target.files[0] })}
          placeholder="Sube foto de perfil"
        />
        <select
          name="rol"
          value={nuevoTrabajador.rol}
          onChange={handleInputChange}
        >
          <option value="">Selecciona un rol</option>
          {rols.map((rol) => (
            <option key={rol.id} value={rol.id}>
              {rol.nombre_rol}
            </option>
          ))}
        </select>
        <select
          name="user"
          value={nuevoTrabajador.user}
          onChange={handleInputChange}
        >
          <option value="">Selecciona un usuario</option>
          {usuarios.map((usuario) => (
            <option key={usuario.id} value={usuario.id}>
              {usuario.username} {/* Cambia esto por el nombre del usuario según lo necesites */}
            </option>
          ))}
        </select>
        <button onClick={handleCreate}>Crear Trabajador</button>
      </div>
      <div className="trabajadores-list">
        <h2>Lista de trabajadores</h2>
        <ul>
          {trabajadores.map((trabajador) => (
            <li key={trabajador.id}>
              {trabajador.nombre} {trabajador.apellido} ({trabajador.correo})
              <button onClick={() => handleDelete(trabajador.id)}>Eliminar</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Trabajadores;
