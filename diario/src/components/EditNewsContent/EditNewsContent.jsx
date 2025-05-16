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
          
        </div>
      )}

      <div className="image-instruction-box" style={{ padding: '15px', marginBottom: '20px', backgroundColor: '#f7f7f7', border: '1px solid #e0e0e0', borderRadius: '5px' }}>
        <p><strong>Nota:</strong> La primer imagen que agregue será la imagen de cabecera de la noticia. Podrá agregar hasta 5 imágenes adicionales.</p>
        <p><strong>Nota 2:</strong> No agregar un titulo a la noticia, el titulo ya se encuentra al crear la misma.</p>
      </div>
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
          
          block_formats: 'Párrafo=p; Heading 1=h1; Heading 2=h2; Citas=h6; Información Adicional=pre',

          plugins: [
            'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview', 'anchor',
            'searchreplace', 'visualblocks', 'code', 'fullscreen',
            'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount',
            'image'
          ],
          toolbar:
            'undo redo | styleselect | formatselect | bold italic underline | blocks | forecolor backcolor | ' +
            'alignleft aligncenter alignright alignjustify | outdent indent | ' +
            'bullist numlist | link image media table | charmap | ' +
            'hr | blockquote | removeformat | help | fullscreen ',
          
          content_style: `
  /* Common styles for all devices */
  body {
    font-family: Arial, sans-serif;
    position: relative;
  }
  
  p {
    font-family: 'Linotype Devanagari';
    font-size: 13pt;
    margin: 0;
    white-space: normal;
    word-break: break-word;
    position: relative;
    z-index: 1;
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
    position: relative;
    z-index: 1;
  }
  
  h2 {
    font-family: 'Pentay Bold';
    font-size: 17pt;
    font-weight: bold;
    font-style: italic;
    position: relative;
    z-index: 1;
  }
  
  h6 {
    font-family: 'MVB Dovetail Light Italic';
    font-size: 13.5pt;
    color: black;
    background-color: #f0f0f0;
    text-indent: 0.2in;
    position: relative;
    z-index: 1;
  }
  
  pre {
    font-family: 'Times New Roman';
    font-size: 9pt;
    color: gray;
    text-align: center;
    margin-top: 0px;
    margin-bottom: 20px;
    position: relative;
    z-index: 1;
    /* Make it behave like h1 in terms of text flow */
    white-space: normal;
    word-break: break-word;
    overflow-wrap: break-word;
    box-sizing: border-box;
    max-width: 100%;
    display: block;
  }
  
  blockquote {
    font-family: 'MVB Dovetail Light Italic';
    font-size: 13.5pt;
    color: black;
    background-color: #f0f0f0;
    position: relative;
    z-index: 1;
  }
  
  img {
    width: 100%;
    height: 400px;
    margin-bottom: 0px;
    object-fit: cover;
    position: relative;
    z-index: 1;
  }

  /* Desktop-specific styles with margin lines */
  @media screen and (min-width: 769px) {
    body {
      margin-left: 240px;
      margin-right: 240px;
      background-image: 
        linear-gradient(to right, transparent 199px,rgb(32, 32, 32) 199px,rgb(32, 32, 32) 200px, transparent 200px),
        linear-gradient(to right, transparent calc(100% - 201px), rgb(32, 32, 32) calc(100% - 201px), rgb(32, 32, 32) calc(100% - 200px), transparent calc(100% - 200px));
      background-repeat: repeat-y;
      min-height: 100vh;
    }
    
    /* Remove the pseudo-element approach */
    body:before, body:after {
      display: none;
    }

    /* Set max-width for pre elements to ensure they don't overflow */
    pre {
      /* Reset the special handling and make it behave like h1 */
      max-width: 100%;
      margin-left: 0;
      margin-right: 0;
    }
  }
  
  /* Left margin vertical line */
  body:before {
    content: '';
    position: fixed;
    top: 0;
    bottom: 0;
    left: 200px;
    width: 1px;
    height: 100%;
    background-color:rgb(78, 78, 78);
    z-index: 0;
  }

  /* Right margin vertical line */
  body:after {
    content: '';
    position: fixed;
    top: 0;
    bottom: 0;
    right: 200px;
    width: 1px;
    height: 100%;
    background-color: rgb(78, 78, 78);
    z-index: 0;
  }

  /* Mobile-specific styles with no margin lines */
  @media screen and (max-width: 768px) {
    body {
      max-width: 100%;
      width: 100%;
      word-wrap: break-word;
      overflow-wrap: break-word;
      writing-mode: horizontal-tb;
      text-orientation: mixed;
      direction: ltr;
    }
    
    /* No margin lines for mobile */
    body:before, body:after {
      display: none;
    }
    
    /* Ensure pre elements are properly contained on mobile */
    pre {
      width: 100%;
      box-sizing: border-box;
    }
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
              title: 'Citas',
              format: 'h6',
            },
            {
              title: 'Párrafo',
              format: 'p',
            },
            {
              title: 'Información Adicional',
              format: 'pre',
            }
          ],
          setup: function (editor) {
            editor.ui.registry.addButton('formatselect', {
              text: 'Párrafo',
              tooltip: 'Formato',
              onAction: function () {
                editor.execCommand('mceToggleFormat');
              }
            });
            // Add a custom handler for the clear formatting command
            editor.on('BeforeExecCommand', function(e) {
              if (e.command === 'RemoveFormat') {
                // Get the selected content and nodes
                const selectedNode = editor.selection.getNode();
                const selectedContent = editor.selection.getContent();
                const selectedRange = editor.selection.getRng();
                
                // First let TinyMCE's default RemoveFormat run
                setTimeout(function() {
                  // Then convert the selection to a paragraph format
                  editor.formatter.apply('p');
                  
                  // Apply the standard paragraph styling
                  const paragraphNode = editor.selection.getNode();
                  if (paragraphNode) {
                    paragraphNode.style.fontFamily = 'Linotype Devanagari';
                    paragraphNode.style.fontSize = '13pt';
                    paragraphNode.style.margin = '0';
                    paragraphNode.style.padding = '0';
                    paragraphNode.style.fontWeight = 'normal';
                    paragraphNode.style.fontStyle = 'normal';
                    paragraphNode.style.textDecoration = 'none';
                    paragraphNode.style.backgroundColor = '';
                    paragraphNode.style.color = '';
                  }
                }, 0);
              }
            });
            
            editor.on('keydown', function (e) {
              if (e.key === 'Enter') {
                e.preventDefault();
                
                // Get current node and its complete styling
                const currentNode = editor.selection.getNode();
                
                // Capture all relevant styles
                const styles = window.getComputedStyle(currentNode);
                const backgroundColor = styles.backgroundColor;
                const color = styles.color;
                const fontFamily = currentNode.style.fontFamily || styles.fontFamily || 'Linotype Devanagari';
                
                // Check if we're in a special format (h1, h2, etc.)
                const nodeName = currentNode.nodeName.toLowerCase();
                
                // Don't preserve formatting for headings and special formats
                if (['h1', 'h2', 'h6', 'pre', 'blockquote'].includes(nodeName)) {
                  // For headings, just insert a standard paragraph without special formatting
                  editor.insertContent('<p style="margin: 0; padding: 0; font-family: Linotype Devanagari; font-size: 13pt;">\u200B</p>');
                } else {
                  // For regular paragraphs, preserve the background color
                  const bgColorStyle = backgroundColor && backgroundColor !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'transparent' 
                    ? `background-color: ${backgroundColor};` 
                    : '';
                  
                  const textColorStyle = color && color !== 'rgba(0, 0, 0, 0)' 
                    ? `color: ${color};` 
                    : '';
                  
                  // Insert new paragraph with preserved styles
                  editor.insertContent(`<p style="margin: 0; padding: 0; font-family: ${fontFamily}; font-size: 13pt; ${bgColorStyle} ${textColorStyle}">\u200B</p>`);
                }
                
                editor.execCommand('FormatBlock', false, 'p');
                
                // Set cursor position
                const newNode = editor.selection.getNode();
                if (newNode) {
                  const rng = editor.selection.getRng();
                  rng.setStart(newNode, 0);
                  rng.setEnd(newNode, 0);
                  editor.selection.setRng(rng);
                }
                
                // Maintain focus
                editor.focus();
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

            // Keep your FormatChanged event handler
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
            
            // Add a specific handling for the Clear Formatting toolbar button
            editor.on('init', function() {
              editor.shortcuts.add('meta+space', 'Clear formatting and convert to paragraph', function() {
                editor.execCommand('RemoveFormat');
                editor.formatter.apply('p');
                
                const paragraphNode = editor.selection.getNode();
                if (paragraphNode) {
                  paragraphNode.style.fontFamily = 'Linotype Devanagari';
                  paragraphNode.style.fontSize = '13pt';
                  paragraphNode.style.margin = '0';
                }
              });
              
              // Look for the clear formatting button and add a custom handler
              const clearFormatButton = editor.editorContainer.querySelector('[title="Clear formatting"]');
              if (clearFormatButton) {
                clearFormatButton.addEventListener('mousedown', function(e) {
                  e.preventDefault();
                  e.stopPropagation();
                  
                  // Execute our custom command that applies paragraph formatting after clearing
                  editor.execCommand('RemoveFormat');
                  editor.formatter.apply('p');
                  
                  const paragraphNode = editor.selection.getNode();
                  if (paragraphNode) {
                    paragraphNode.style.fontFamily = 'Linotype Devanagari';
                    paragraphNode.style.fontSize = '13pt';
                    paragraphNode.style.margin = '0';
                  }
                  
                  return false;
                });
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