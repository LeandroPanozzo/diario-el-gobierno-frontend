import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, message, Form, Input, Checkbox, Select } from 'antd';
import { Editor } from '@tinymce/tinymce-react';
import axios from 'axios';
import './EditNewsContent.css';
import api from '../../pages/context/axiosConfig';

export const EditNewsContent = () => {
  const { id } = useParams();
  const [form] = Form.useForm();
  const [content, setContent] = useState('');
  const [newsData, setNewsData] = useState({});
  const [headerImage, setHeaderImage] = useState('');
  const [allImages, setAllImages] = useState([]);
  const navigate = useNavigate();

  const defaultImages = {
    imagen_cabecera: 'default_header_image_url',
    imagen_1: 'default_image_1_url',
    imagen_2: 'default_image_2_url',
    imagen_3: 'default_image_3_url',
    imagen_4: 'default_image_4_url',
    imagen_5: 'default_image_5_url',
    imagen_6: 'default_image_6_url',
  };

  useEffect(() => {
    // Verificar si el usuario es un trabajador
    const verifyTrabajador = async () => {
      const accessToken = localStorage.getItem('access');
      
      if (!accessToken) {
        navigate('/login');
        return;
      }
    
      try {
        // Use the same endpoint as in UserContext
        const response = await api.get('current-user/', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });
    
        // Check if user is a worker using the same condition as in UserContext
        if (!response.data.isWorker) {
          navigate('/login');
          return;
        }
      } catch (error) {
        console.error('Error verifying trabajador:', error);
        navigate('/login');
      }
    };

    verifyTrabajador(); // Llamar a la función de verificación

    const fetchContent = async () => {
      try {
        const response = await api.get(`noticias/${id}/`);
        const { contenido, imagen_cabecera, subtitulo, ...rest } = response.data;

        setContent(contenido);
        setHeaderImage(imagen_cabecera || '');
        setNewsData({ ...rest, subtitulo });
        form.setFieldsValue({ ...rest, subtitulo });

        const extractedImages = extractImagesFromContent(contenido);
        const allImageUrls = [imagen_cabecera, ...extractedImages].filter(url => url);
        setAllImages(allImageUrls);
      } catch (error) {
        console.error('Failed to update content:', error);
        console.error('Error details:', error.response?.data || 'No response data');
        console.error('Status code:', error.response?.status);
        message.error(`Error al guardar el contenido: ${error.response?.data?.detail || error.message}`);
      }
    };

    fetchContent();
  }, [id, form, navigate]); // Agregar navigate a las dependencias

  const handleImageUpload = (blobInfo, progress) => new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', blobInfo.blob(), blobInfo.filename());
  
    api.post('upload_image/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        progress(progressEvent.loaded / progressEvent.total * 100);
      }
    })
      .then(response => {
        if (response.data.success && response.data.url) {
          const imageUrl = response.data.url;
          setAllImages(prevImages => [...prevImages, imageUrl]);
          resolve(imageUrl);
        } else if (response.data.url) {
          // Handle legacy response format
          const imageUrl = response.data.url;
          setAllImages(prevImages => [...prevImages, imageUrl]);
          resolve(imageUrl);
        } else {
          reject('Upload failed: No valid URL in response');
        }
      })
      .catch(error => {
        console.error('Image upload error:', error);
        reject('HTTP Error: ' + (error.message || 'Unknown error'));
      });
  });

  const extractImagesFromContent = (content) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    const images = doc.querySelectorAll('img');
    return Array.from(images).map(img => img.src);
  };

  const removeImageFromContent = (content, imageUrl) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    
    const images = doc.querySelectorAll('img');
    images.forEach((img) => {
      if (img.src === imageUrl) {
        img.remove();
      }
    });

    return doc.body.innerHTML;
  };

  const handleSave = async () => {
    try {
      // Extract just the image path if it's a full base64 string
      const cleanHeaderImage = headerImage.startsWith('data:image') 
        ? '' // or extract path if possible
        : headerImage;
  
      const updateData = {
        ...newsData,
        contenido: content || '',
        subtitulo: newsData.subtitulo || '',
        imagen_cabecera: cleanHeaderImage || '',
        // Other images
        imagen_1: '',
        imagen_2: '',
        imagen_3: '',
        imagen_4: '', 
        imagen_5: '',
        imagen_6: '',
      };
  
      console.log("Sending data:", updateData);
  
      const response = await api.put(`noticias/${id}/`, updateData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
  
      message.success('Contenido actualizado exitosamente');
      navigate('/ed');
    } catch (error) {
      console.error('Full error object:', error);
      
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Status code:', error.response.status);
        console.error('Response headers:', error.response.headers);
        
        if (error.response.data && typeof error.response.data === 'object') {
          Object.entries(error.response.data).forEach(([key, value]) => {
            message.error(`${key}: ${Array.isArray(value) ? value.join(', ') : value}`);
          });
        } else {
          message.error(`Server error: ${error.response.statusText || 'Unknown error'}`);
        }
      } else if (error.request) {
        console.error('Request:', error.request);
        message.error('No response received from server');
      } else {
        console.error('Error:', error.message);
        message.error('Request failed to send');
      }
    }
  };
  const handleHeaderImageChange = (value) => {
    const oldHeaderImage = headerImage;
    setHeaderImage(value);

    if (oldHeaderImage) {
      // Add old header image back to content if it's not the new header image
      if (oldHeaderImage !== value) {
        setContent(prevContent => prevContent + `<img src="${oldHeaderImage}" data-field="imagen" />`);
      }
    }

    // Remove new header image from content
    setContent(prevContent => removeImageFromContent(prevContent, value));
  };

  return (
    <div style={{ marginTop: '120px' }}>
    <div>
      {headerImage && (
        <div style={{ marginBottom: 10 }}>
          <strong>Imagen de cabecera seleccionada:</strong> <br />
          <img src={headerImage} alt="Imagen de cabecera" style={{ width: '100px', height: 'auto' }} />
        </div>
      )}

      <Form.Item label="Seleccionar imagen de cabecera">
        <Select onChange={handleHeaderImageChange} value={headerImage}>
          <Select.Option value="" disabled>Seleccionar imagen</Select.Option>
          {allImages.map((imgUrl, index) => (
            <Select.Option key={index} value={imgUrl}>
              Imagen {index + 1}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>
      <Editor
        apiKey="n4p00cmzpfhi984ei5sgacg93brnu89dco7io30mvon29srl"
        value={content}
        init={{
          height: 500,
          menubar: false,
          images_upload_handler: handleImageUpload,
          automatic_uploads: false,
          images_upload_credentials: true,
          convert_urls: false,
          
          block_formats: 'Paragraph=p; Heading 1=h1; Heading 2=h2; Heading 6=h6; Preformatted=pre',
          plugins: [
            'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview', 'anchor',
            'searchreplace', 'visualblocks', 'code', 'fullscreen',
            'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount',
            'image'
            // Remove or comment out 'print' and 'paste'
          ],
          toolbar:
            'undo redo | styleselect | formatselect | bold italic underline | blocks | forecolor backcolor | ' +
            'alignleft aligncenter alignright alignjustify | outdent indent | ' +
            'bullist numlist | link image media table | charmap | ' +
            'hr | blockquote | removeformat | help | fullscreen ',
          
          content_style: `
            @media screen and (min-width: 769px) {
            body {
              margin-left: 200px;
              margin-right: 200px;
              font-family: Arial, sans-serif;
            }
          }

          @media screen and (max-width: 768px) {
            body {
              font-family: Arial, sans-serif;
              max-width: 100%;
              width: 100%;
              word-wrap: break-word;
              overflow-wrap: break-word;
              writing-mode: horizontal-tb;
              text-orientation: mixed;
              direction: ltr;
            }
          }

          p {
            font-family: 'Linotype Devanagari';
            font-size: 13pt;
            margin: 0;
            white-space: normal;
            word-break: break-word;
          }
            .news-detail-container {
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
            }
            h1 {
              font-family: 'Pentay Bold';
              font-size: 18pt;
              font-weight: bold;
            }
            h2 {
              font-family: 'Pentay Bold';
              font-size: 17pt;
              font-weight: bold;
              font-style: italic;
            }
            h6 {
              font-family: 'MVB Dovetail Light Italic';
              font-size: 13.5pt;
              color: black;
              background-color: #f0f0f0;
              text-indent: 0.2in;
            }
            pre {
              font-family: 'Times New Roman';
              font-size: 9pt;
              color: gray;
              text-align: center;
              margin-top: 0px;
              margin-bottom: 20px;
            }
            blockquote {
              font-family: 'MVB Dovetail Light Italic';
              font-size: 13.5pt;
              color: black;
              background-color: #f0f0f0;
            }
            img {
              width: 100%;
              height: 400px;
              margin-bottom: 0px;
              object-fit: cover;
            }
              
          `,
          font_formats:
            "Arial=arial,helvetica,sans-serif;" +
            "Georgia=georgia,palatino;" +
            "Helvetica=helvetica;" +
            "Times New Roman=times new roman,times;" +
            "Verdana=verdana,geneva;" +
            "Pentay Bold=pentay bold,sans-serif;" +
            "Linotype Devanagari=Linotype Devanagari;" +
            "MVB Dovetail Light Italic=MVB Dovetail Light Italic;",
          fontsize_formats: "8pt 10pt 12pt 14pt 17pt 18pt 24pt 36pt",
          style_formats: [
            {
              title: 'Heading 1',
              format: 'h1',
            },
            {
              title: 'Heading 2',
              format: 'h2',
            },
            {
              title: 'Heading 6',
              format: 'h6',
            },
            {
              title: 'Paragraph',
              format: 'p',
            },
            {
              title: 'Preformatted',
              format: 'pre',
            }
          ],
          setup: function (editor) {
            
            editor.on('keydown', function (e) {
              if (e.key === 'Enter') {
                e.preventDefault();
                
                // Limpiar formato existente
                editor.execCommand('RemoveFormat');
                editor.execCommand('mceRemoveFormat', false, 'strong');
                editor.execCommand('mceRemoveFormat', false, 'em');
                editor.execCommand('mceRemoveFormat', false, 'u');
                
                // Insertar el nuevo párrafo con un espacio no rompible
                editor.insertContent('<p style="margin: 0; padding: 0;">\u200B</p>');
                editor.execCommand('FormatBlock', false, 'p');
                
                // Obtener y configurar el nuevo nodo
                const newNode = editor.selection.getNode();
                if (newNode) {
                  // Estilos base
                  newNode.style.fontFamily = 'Linotype Devanagari';
                  newNode.style.fontSize = '13pt';
                  newNode.style.margin = '0';
                  newNode.style.padding = '0';
                  newNode.style.lineHeight = '1';
                  
                  // Limpiar estilos adicionales
                  newNode.style.fontWeight = 'normal';
                  newNode.style.fontStyle = 'normal';
                  newNode.style.textDecoration = 'none';
                  newNode.style.backgroundColor = '';
                  newNode.style.color = '';
                  
                  // Asegurar que el cursor esté al inicio del nuevo párrafo
                  const rng = editor.selection.getRng();
                  rng.setStart(newNode, 0);
                  rng.setEnd(newNode, 0);
                  editor.selection.setRng(rng);
                }
                
                // Mantener el foco en el editor
                editor.focus();
                
                // Asegurar que el párrafo permanezca vacío pero visible
                if (newNode && !newNode.innerHTML.trim()) {
                  newNode.innerHTML = '\u200B';
                }
              }
            });
            editor.on('BeforeSetContent', function (e) {
              if (e.format === 'html') {
                e.content = e.content.replace(/<h1>/g, '<h1 style="font-family: Pentay Bold; font-size: 18pt; font-weight: bold;">');
                e.content = e.content.replace(/<h2>/g, '<h2 style="font-family: Pentay Bold; font-size: 17pt; font-weight: bold; font-style: italic;">');
                e.content = e.content.replace(/<h6>/g, '<h6 style="font-family: MVB Dovetail Light Italic; font-size: 13.5pt; color: black; background-color: #f0f0f0; text-indent: 0.2in;">');
                e.content = e.content.replace(/<blockquote>/g, '<blockquote style="font-family: MVB Dovetail Light Italic; font-size: 13.5pt; color: black; background-color: #f0f0f0;">');
                e.content = e.content.replace(/<pre>/g, '<pre style="font-family: Times New Roman; font-size: 9pt; color: gray;">');
              }
            });

            editor.on('NodeChange', function (e) {
              const { nodeName } = e.element;
              if (nodeName === 'H1') {
                e.element.style.fontFamily = 'Pentay Bold';
                e.element.style.fontSize = '18pt';
                e.element.style.fontWeight = 'bold';
              } else if (nodeName === 'H2') {
                e.element.style.fontFamily = 'Pentay Bold';
                e.element.style.fontSize = '17pt';
                e.element.style.fontWeight = 'bold';
                e.element.style.fontStyle = 'italic';
              } else if (nodeName === 'H6') {
                e.element.style.fontFamily = 'MVB Dovetail Light Italic';
                e.element.style.fontSize = '13.5pt';
                e.element.style.color = 'black';
                e.element.style.backgroundColor = '#f0f0f0';
                e.element.style.textIndent = '0.2in';
              } else if (nodeName === 'P') {
                e.element.style.fontFamily = 'Linotype Devanagari';
                e.element.style.fontSize = '13pt';
                e.element.style.margin = '0';
              } else if (nodeName === 'PRE') {
                e.element.style.fontFamily = 'Times New Roman';
                e.element.style.fontSize = '9pt';
                e.element.style.color = 'gray';
              }
            });

      // Agregar un evento para eliminar negrita al cambiar a párrafo o preformateado
      editor.on('FormatChanged', function (e) {
        const selectedNode = editor.selection.getNode();
        if (selectedNode) {
          const tagName = selectedNode.nodeName;
          if (tagName === 'P' || tagName === 'PRE') {
            editor.execCommand('RemoveFormat');
            editor.execCommand('mceRemoveFormat', false, 'strong');
            editor.execCommand('mceRemoveFormat', false, 'b');
          }
        }
      });
    },
    formats: {
      h1: { block: 'h1' },
      h2: { block: 'h2' },
      h6: { block: 'h6' },
      p: { block: 'p' },
      blockquote: { block: 'blockquote' },
      pre: { block: 'pre' }
    }
  }}
  
  onEditorChange={(newContent) => {
    setContent(newContent);
    const newImages = extractImagesFromContent(newContent);
    setAllImages(prevImages => {
      const combinedImages = [...new Set([...prevImages, ...newImages])];
      return combinedImages.filter(url => url !== headerImage);
    });
  }}
/>


      <Button type="primary" onClick={handleSave} style={{ marginTop: 20 }}>
        Guardar
      </Button>
    </div>
    </div>
  );
};