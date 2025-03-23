import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useUser } from '../../pages/context/UserContext';

const NewsReactions = ({ noticiaId }) => {
  const { user } = useUser();
  const [reacciones, setReacciones] = useState({
    interesa: 0,
    divierte: 0,
    entristece: 0,
    enoja: 0
  });
  const [userReaction, setUserReaction] = useState(null);
  const [hoveredReaction, setHoveredReaction] = useState(null); // Estado para hover

  const reactionInfo = {
    interesa: { emoji: '🤔', label: 'Me interesa', color: '#F7B125' },
    divierte: { emoji: '😄', label: 'Me divierte', color: '#F7B125' },
    entristece: { emoji: '😢', label: 'Me entristece', color: '#F7B125' },
    enoja: { emoji: '😠', label: 'Me enoja', color: '#E9493B' }
  };

  useEffect(() => {
    fetchReactions();
  }, [noticiaId]);

  const fetchReactions = async () => {
    try {
      const response = await axios.get(`http://127.0.0.1:8000/diarioback/noticias/${noticiaId}/reacciones/`);
      setReacciones(response.data);
      if (user) {
        const userResponse = await axios.get(
          `http://127.0.0.1:8000/diarioback/noticias/${noticiaId}/mi-reaccion/`,
          { headers: { Authorization: `Bearer ${user.access}` } }
        );
        setUserReaction(userResponse.data.tipo_reaccion);
      }
    } catch (error) {
      console.error('Error fetching reactions:', error);
    }
  };

  const handleReaction = async (tipo) => {
    if (!user) {
      alert('Debes iniciar sesión para reaccionar');
      return;
    }

    try {
      if (userReaction === tipo) {
        await axios.delete(`http://127.0.0.1:8000/diarioback/noticias/${noticiaId}/reacciones/`, {
          headers: { Authorization: `Bearer ${user.access}` }
        });
        setUserReaction(null);
      } else {
        await axios.post(`http://127.0.0.1:8000/diarioback/noticias/${noticiaId}/reacciones/`, 
          { tipo_reaccion: tipo }, 
          { headers: { Authorization: `Bearer ${user.access}` } }
        );
        setUserReaction(tipo);
      }
      fetchReactions();
    } catch (error) {
      console.error('Error updating reaction:', error);
    }
  };

  return (
    <div className="relative p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center justify-center gap-6"> {/* Aumentamos el gap entre emojis */}
        {Object.entries(reactionInfo).map(([tipo, info]) => (
          <button
            key={tipo}
            onClick={() => handleReaction(tipo)}
            onMouseEnter={() => setHoveredReaction(tipo)} // Mostrar el texto en hover
            onMouseLeave={() => setHoveredReaction(null)} // Ocultar el texto al salir del hover
            className={`flex flex-col items-center p-3 rounded-lg transition-transform duration-300 
              ${userReaction === tipo ? 'bg-gray-200 scale-110' : 'hover:bg-gray-100'}
            `}
            style={{ borderColor: userReaction === tipo ? info.color : 'transparent', borderWidth: '2px' }}
          >
            <span className="text-3xl transition-transform duration-300">
              {info.emoji}
            </span>
            <span className="mt-2 text-sm font-semibold" style={{ color: userReaction === tipo ? info.color : '#6B7280' }}>
              {reacciones[tipo]}
            </span>
            {/* Mostrar el texto solo cuando el emoji esté siendo hoverado */}
            {hoveredReaction === tipo && (
              <span className="mt-1 text-xs text-gray-600 opacity-0 transition-opacity duration-300 ease-in-out opacity-100">
                {info.label}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="absolute -top-3 -right-3 bg-gray-200 text-gray-600 text-xs font-medium px-3 py-1 rounded-full shadow-md">
        {Object.values(reacciones).reduce((a, b) => a + b, 0)} reacciones
      </div>
    </div>
  );
};

export default NewsReactions;

