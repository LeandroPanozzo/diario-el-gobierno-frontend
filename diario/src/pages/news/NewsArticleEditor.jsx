import React, { useState, useEffect } from 'react';
import { Table, Form, Button, Modal, Select, Checkbox, Input, DatePicker, Popconfirm } from 'antd';
import { EditOutlined, PlusOutlined, DeleteOutlined, CommentOutlined } from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';
import { useNavigate } from 'react-router-dom';
import './NewsManagement.css';
const { Option } = Select;
const { TextArea } = Input;

const NewsManagement = () => {
  const [news, setNews] = useState([]);
  const [editors, setEditors] = useState([]);
  const [publicationStates, setPublicationStates] = useState([]);
  const [filteredPublicationStates, setFilteredPublicationStates] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [trabajadorId, setTrabajadorId] = useState(null);
  const navigate = useNavigate();
  
  const CATEGORIAS = [
    ['Portada', 'portada'],
    ['Politica', [
      ['legislativos', 'Legislativos'],
      ['judiciales', 'Judiciales'],
      ['conurbano', 'Conurbano'],
      ['provincias', 'Provincias'],
      ['municipios', 'Municipios'],
      ['protestas', 'Protestas']
    ]],
    ['Cultura', [
      ['cine', 'Cine'],
      ['literatura', 'Literatura'],
      ['moda', 'Moda'],
      ['tecnologia', 'Tecnologia'],
      ['eventos', 'Eventos']
    ]],
    ['Economia', [
      ['finanzas', 'Finanzas'],
      ['negocios', 'Negocios'],
      ['empresas', 'Empresas'],
      ['dolar', 'Dolar']
    ]],
    ['Mundo', [
      ['argentina', 'Argentina'],
      ['china', 'China'],
      ['estados_unidos', 'Estados Unidos'],
      ['brasil', 'Brasil'],
      ['america', 'America'],
      ['latinoamerica', 'Latinoamerica'],
      ['asia', 'Asia'],
      ['africa', 'Africa'],
      ['oceania', 'Oceania'],
      ['antartica', 'Antartica'],
      ['internacional', 'Internacional'],
      ['seguridad', 'Seguridad'],
      ['comercio', 'Comercio'],
      ['guerra', 'Guerra']
    ]]
  ];

  useEffect(() => {
    fetchNews();
    fetchEditors();
    fetchPublicationStates();
    verifyTrabajador();

    const handleKeyDown = (event) => {
      if (event.key === 'F12') {
        console.log('ID del trabajador:', trabajadorId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [trabajadorId]);

  const fetchNews = () => {
    axios.get('http://127.0.0.1:8000/diarioback/noticias/')
      .then(response => {
        const filteredNews = response.data
          .filter(noticia => 
            noticia.autor === trabajadorId || noticia.editor_en_jefe === trabajadorId
          )
          .sort((a, b) => moment(b.fecha_publicacion).diff(moment(a.fecha_publicacion)));
        setNews(filteredNews);
      });
  };

  const fetchEditors = () => {
    axios.get('http://127.0.0.1:8000/diarioback/trabajadores/')
      .then(response => setEditors(response.data));
  };

  const fetchPublicationStates = () => {
    axios.get('http://127.0.0.1:8000/diarioback/estados-publicacion/')
      .then(response => setPublicationStates(response.data));
  };

  const verifyTrabajador = () => {
    const accessToken = localStorage.getItem('access');
    if (!accessToken) {
      navigate('/home');
      return;
    }
  
    axios.get('http://127.0.0.1:8000/diarioback/user-profile/', {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    }).then(response => {
      console.log("Perfil recibido:", response.data); // Para depurar
      // Verifica si el usuario es un trabajador (ajusta esta condición según tu API)
      if (response.data.id) {
        setTrabajadorId(response.data.id);
      } else {
        navigate('/home');
      }
    }).catch(error => {
      console.error("Error al verificar el perfil:", error);
      navigate('/home');
    });
  };

  const showModal = (record = null) => {
    if (record) {
      form.setFieldsValue({
        ...record,
        fecha_publicacion: moment(record.fecha_publicacion),
        solo_para_subscriptores: record.solo_para_subscriptores || false,
        Palabras_clave: record.Palabras_clave || '',
        categorias: record.categorias || [],
        estado: record.estado ? parseInt(record.estado, 10) : undefined,
      });
      setEditingId(record.id);

      if (trabajadorId === record.autor) {
        setFilteredPublicationStates(publicationStates.filter(state => state.nombre_estado !== 'publicado'));
      } else if (trabajadorId === record.editor_en_jefe) {
        setFilteredPublicationStates(publicationStates);
      } else {
        setFilteredPublicationStates([]);
      }
    } else {
      form.resetFields();
      setEditingId(null);
      setFilteredPublicationStates(publicationStates.filter(state => state.nombre_estado !== 'publicado'));
    }
    setIsModalVisible(true);
  };

  const handleOk = () => {
    form.validateFields().then(values => {
      if (!Array.isArray(values.categorias)) {
        values.categorias = values.categorias ? [values.categorias] : [];
      }
      
      const noticiaEditada = {
        nombre_noticia: values.nombre_noticia,
        fecha_publicacion: values.fecha_publicacion.format('YYYY-MM-DD'),
        categorias: values.categorias.join(','),
        Palabras_clave: values.Palabras_clave || '',
        autor: parseInt(values.autor, 10),
        editor_en_jefe: parseInt(values.editor_en_jefe, 10),
        estado: parseInt(values.estado, 10),
        solo_para_subscriptores: values.solo_para_subscriptores || false,
        subtitulo: values.subtitulo || 'default content',
        imagen_cabecera: values.imagen_cabecera || '',
        imagen_1: values.imagen_1 || '',
        imagen_2: values.imagen_2 || '',
        imagen_3: values.imagen_3 || '',
        imagen_4: values.imagen_4 || '',
        imagen_5: values.imagen_5 || '',
        imagen_6: values.imagen_6 || ''
      };
  
      const submitData = () => {
        const url = editingId 
          ? `http://127.0.0.1:8000/diarioback/noticias/${editingId}/`
          : 'http://127.0.0.1:8000/diarioback/noticias/';
        
        const method = editingId ? 'put' : 'post';
  
        axios[method](url, noticiaEditada)
          .finally(() => {
            setIsModalVisible(false);
            setTimeout(() => {
              window.location = window.location;
            }, 100);
          });
      };
  
      submitData();
    });
  };
  const handleDelete = (id) => {
    axios.delete(`http://127.0.0.1:8000/diarioback/noticias/${id}/`)
      .then(() => window.location.reload());
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    console.log('Search term:', e.target.value);
  };

  const handleEditContent = (id) => {
    navigate(`/edit-content/${id}`);
    console.log('Navigating to edit content for news ID:', id);
  };

  const handleComment = (id) => {
    navigate(`/comments/${id}`);
    console.log('Navigating to comments for news ID:', id);
  };

  const filteredNews = news.filter(record => 
    record.nombre_noticia.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  console.log('Filtered News:', filteredNews);

  const columns = [
    { title: 'Titulo', dataIndex: 'nombre_noticia', key: 'nombre_noticia' },
    { 
      title: 'Autor', 
      key: 'autor',
      render: (text, record) => {
        const author = editors.find(editor => editor.id === record.autor);
        return author ? `${author.nombre} ${author.apellido}` : 'Unknown';
      }
    },
    { 
      title: 'Editor', 
      key: 'editor_en_jefe',
      render: (text, record) => {
        const editor = editors.find(editor => editor.id === record.editor_en_jefe);
        return editor ? `${editor.nombre} ${editor.apellido}` : 'Unknown';
      }
    },
    
    { title: 'Fecha de publicacion', dataIndex: 'fecha_publicacion', key: 'fecha_publicacion' },
    { 
      title: 'Categories', 
      key: 'categorias',
      render: (text, record) => {
        return record.categorias ? record.categorias.join(', ') : '';
      }
    },
    { title: 'Subscribers Only', dataIndex: 'solo_para_subscriptores', key: 'solo_para_subscriptores', render: (text) => text ? 'Yes' : 'No' },
    { 
      title: 'Status', 
      key: 'estado',
      render: (text, record) => {
        const status = publicationStates.find(state => state.id === record.estado);
        return status ? status.nombre_estado : 'Unknown';
      }
    },
    { title: 'Palabras_clave', dataIndex: 'Palabras_clave', key: 'Palabras_clave' },
    {
      title: 'Actions',
      key: 'actions',
      render: (text, record) => (
        <span>
          <Button icon={<EditOutlined />} onClick={() => showModal(record)} style={{ marginRight: 8 }} />
          <Popconfirm
            title="Are you sure to delete this news?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button icon={<DeleteOutlined />} danger style={{ marginRight: 8 }} />
          </Popconfirm>
          <Button onClick={() => handleEditContent(record.id)} style={{ marginRight: 8 }}>Edit Content</Button>
          <Button icon={<CommentOutlined />} onClick={() => handleComment(record.id)}>Comment</Button>
        </span>
      ),
    },
  ];

  const renderCategoryOptions = () => {
    return CATEGORIAS.map(([value, labelOrSubcats]) => {
      if (Array.isArray(labelOrSubcats)) {
        // This is a category with subcategories
        const [categoryLabel, subcategories] = [value, labelOrSubcats];
        return (
          <Select.OptGroup label={categoryLabel} key={categoryLabel}>
            {subcategories.map(([subValue, subLabel]) => (
              <Option key={subValue} value={subValue}>{subLabel}</Option>
            ))}
          </Select.OptGroup>
        );
      } else {
        // This is a standalone category
        return <Option key={value} value={value}>{labelOrSubcats}</Option>;
      }
    });
  };

  return (
    <div>
      {/* Barra de búsqueda */}
      <div className="search-bar">
        <Input 
          placeholder="Buscar por nombre de noticia..." 
          value={searchTerm} 
          onChange={handleSearch} 
          style={{ marginBottom: 16, width: '300px' }} 
        />
      </div>

      {/* Botón para crear una nueva noticia */}
      <div className="add-news-button">
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={() => showModal()} 
          style={{ marginBottom: 16 }}
        >
          Add News
        </Button>
      </div>

      {/* Tabla de noticias */}
      <Table columns={columns} dataSource={filteredNews} rowKey="id" />

      {/* Modal para crear/editar noticias */}
      <Modal
        title={editingId ? "Edit News" : "Add News"}
        open={isModalVisible}
        onOk={handleOk}
        onCancel={() => setIsModalVisible(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="nombre_noticia" label="Title" rules={[{ required: true, message: 'Please input the title!' }]}>
            <Input />
          </Form.Item>

          <Form.Item name="autor" label="Author" rules={[{ required: true, message: 'Please select an author!' }]}>
            <Select
              showSearch
              placeholder="Select an author"
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
            >
              {editors.map(editor => (
                <Option key={editor.id} value={editor.id}>{`${editor.nombre} ${editor.apellido}`}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="editor_en_jefe" label="Editor-in-Chief">
            <Select
              showSearch
              placeholder="Select an editor-in-chief"
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
            >
              {editors.map(editor => (
                <Option key={editor.id} value={editor.id}>{`${editor.nombre} ${editor.apellido}`}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="fecha_publicacion" label="Publication Date" rules={[{ required: true, message: 'Please select the publication date!' }]}>
            <DatePicker />
          </Form.Item>

          <Form.Item 
            name="categorias" 
            label="Categories"
            rules={[{ required: true, message: 'Please select at least one category!' }]}
          >
            <Select
              mode="multiple"
              placeholder="Select categories"
              style={{ width: '100%' }}
            >
              {renderCategoryOptions()}
            </Select>
          </Form.Item>

          <Form.Item name="solo_para_subscriptores" valuePropName="checked">
            <Checkbox>Subscribers Only</Checkbox>
          </Form.Item>

          <Form.Item name="estado" label="Status">
            <Select>
              {filteredPublicationStates.map(state => (
                <Option key={state.id} value={state.id}>{state.nombre_estado}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="Palabras_clave" label="Palabras clave">
            <TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default NewsManagement;