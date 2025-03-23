import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Rol = () => {
  const [nombreRol, setNombreRol] = useState('');
  const [permisos, setPermisos] = useState({
    puede_publicar: false,
    puede_editar: false,
    puede_eliminar: false,
    puede_asignar_roles: false,
    puede_dejar_comentarios: false,
  });
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch roles from API when component mounts
    const fetchRoles = async () => {
      try {
        const response = await axios.get('http://localhost:8000/diarioback/roles/');
        setRoles(response.data);
      } catch (error) {
        console.error('Error al obtener los roles:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchRoles();
  }, []);

  const handleInputChange = (e) => {
    const { name, checked } = e.target;
    setPermisos((prevPermisos) => ({
      ...prevPermisos,
      [name]: checked,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:8000/diarioback/roles/', {
        nombre_rol: nombreRol,
        ...permisos,
      });
      console.log('Rol creado:', response.data);
      // Reset form and update role list
      setNombreRol('');
      setPermisos({
        puede_publicar: false,
        puede_editar: false,
        puede_eliminar: false,
        puede_asignar_roles: false,
        puede_dejar_comentarios: false,
      });
      // Refresh the role list
      const updatedRoles = await axios.get('http://localhost:8000/diarioback/roles/');
      setRoles(updatedRoles.data);
    } catch (error) {
      console.error('Error al crear el rol:', error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://localhost:8000/diarioback/roles/${id}/`);
      console.log('Rol eliminado:', id);
      // Refresh the role list
      const updatedRoles = await axios.get('http://localhost:8000/diarioback/roles/');
      setRoles(updatedRoles.data);
    } catch (error) {
      console.error('Error al eliminar el rol:', error);
    }
  };

  return (
    <div>
      <h2>Crear Rol</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Nombre del rol:</label>
          <input
            type="text"
            value={nombreRol}
            onChange={(e) => setNombreRol(e.target.value)}
            required
          />
        </div>

        <div>
          <label>
            <input
              type="checkbox"
              name="puede_publicar"
              checked={permisos.puede_publicar}
              onChange={handleInputChange}
            />
            Puede publicar
          </label>
        </div>

        <div>
          <label>
            <input
              type="checkbox"
              name="puede_editar"
              checked={permisos.puede_editar}
              onChange={handleInputChange}
            />
            Puede editar
          </label>
        </div>

        <div>
          <label>
            <input
              type="checkbox"
              name="puede_eliminar"
              checked={permisos.puede_eliminar}
              onChange={handleInputChange}
            />
            Puede eliminar
          </label>
        </div>

        <div>
          <label>
            <input
              type="checkbox"
              name="puede_asignar_roles"
              checked={permisos.puede_asignar_roles}
              onChange={handleInputChange}
            />
            Puede asignar roles
          </label>
        </div>

        <div>
          <label>
            <input
              type="checkbox"
              name="puede_dejar_comentarios"
              checked={permisos.puede_dejar_comentarios}
              onChange={handleInputChange}
            />
            Puede dejar comentarios
          </label>
        </div>

        <button type="submit">Crear Rol</button>
      </form>

      <h2>Lista de Roles</h2>
      {loading ? (
        <p>Cargando roles...</p>
      ) : (
        <ul>
          {roles.map((role) => (
            <li key={role.id}>
              {role.nombre_rol}
              <ul>
                <li>Puede publicar: {role.puede_publicar ? 'Sí' : 'No'}</li>
                <li>Puede editar: {role.puede_editar ? 'Sí' : 'No'}</li>
                <li>Puede eliminar: {role.puede_eliminar ? 'Sí' : 'No'}</li>
                <li>Puede asignar roles: {role.puede_asignar_roles ? 'Sí' : 'No'}</li>
                <li>Puede dejar comentarios: {role.puede_dejar_comentarios ? 'Sí' : 'No'}</li>
              </ul>
              <button onClick={() => handleDelete(role.id)}>Eliminar</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Rol;
