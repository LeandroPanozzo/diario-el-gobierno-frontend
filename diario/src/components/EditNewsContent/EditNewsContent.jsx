import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, message, Form, Input, Checkbox, Select, Modal } from 'antd';
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
    // Mostrar alerta sobre formato AVIF al cargar la página (solo una vez)
    const hasSeenAvifWarning = localStorage.getItem('hasSeenAvifWarning');
    
    if (!hasSeenAvifWarning) {
      Modal.warning({
        title: '⚠️ Importante: Formato de Imágenes',
        content: (
          <div>
            <p><strong>No use imágenes en formato AVIF</strong></p>
            <p>El sistema no carga imágenes con extensión .avif</p>
            <p>Por favor, utilice únicamente:</p>
            <ul>
              <li>JPG / JPEG</li>
              <li>PNG</li>
              <li>WebP</li>
            </ul>
          </div>
        ),
        okText: 'Entendido',
        width: 450,
        onOk: () => {
          localStorage.setItem('hasSeenAvifWarning', 'true');
        },
      });
    }

    // Verificar si el usuario es un trabajador
    const verifyTrabajador = async () => {
      const accessToken = localStorage.getItem('access');
      
      if (!accessToken) {
        navigate('/login');
        return;
      }
    
      try {
        const response = await api.get('current-user/', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });
    
        if (!response.data.isWorker) {
          navigate('/login');
          return;
        }
      } catch (error) {
        console.error('Error verifying trabajador:', error);
        navigate('/login');
      }
    };

    verifyTrabajador();

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
  }, [id, form, navigate]);

  const handleImageUpload = (blobInfo, progress) => new Promise((resolve, reject) => {
    // Verificar el tipo de archivo
    const fileType = blobInfo.blob().type;
    const fileName = blobInfo.filename().toLowerCase();
    
    console.log('File type:', fileType);
    console.log('File name:', fileName);
    
    // Rechazar formato AVIF
    if (fileType === 'image/avif' || fileName.endsWith('.avif')) {
      console.log('AVIF detected - rejecting');
      
      // Mostrar mensaje de error
      Modal.error({
        title: '❌ Formato No Soportado',
        content: 'El formato AVIF no está soportado. Por favor, use JPG, PNG o WebP.',
        okText: 'Entendido',
      });
      
      reject('Formato AVIF no soportado');
      return;
    }
    
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

  const cleanContentForStorage = (content) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    
    // Limpiar estilos en elementos con formato
    const formattedElements = doc.querySelectorAll('strong, b, em, i, u');
    formattedElements.forEach(el => {
      el.removeAttribute('style');
      el.removeAttribute('class');
    });
    
    return doc.body.innerHTML;
  };

  const handleSave = async () => {
    try {
      const cleanedContent = cleanContentForStorage(content);
      
      const cleanHeaderImage = headerImage.startsWith('data:image') 
        ? '' 
        : headerImage;

      const updateData = {
        ...newsData,
        contenido: cleanedContent || '',
        subtitulo: newsData.subtitulo || '',
        imagen_cabecera: cleanHeaderImage || '',
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
        message.error('No response received from server: Imagen no compatible');
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
      if (oldHeaderImage !== value) {
        setContent(prevContent => prevContent + `<img src="${oldHeaderImage}" data-field="imagen" />`);
      }
    }

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
          <p><strong>Nota 3:</strong> No usar imagenes con extension .AVIF.</p>
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
            forced_root_block: false,
            force_br_newlines: false,
            force_p_newlines: true,
            invalid_styles: 'font-family font-size color background-color',
            
            paste_data_images: true,
            paste_as_text: false,
            paste_word_valid_elements: "b,strong,i,em,u,s,a[href],p,br,img[src|alt|width|height]",
            paste_retain_style_properties: "none",
            paste_remove_styles: true,
            paste_remove_styles_if_webkit: true,
            paste_strip_class_attributes: "all",
            
            paste_preprocess: function(plugin, args) {
              console.log('Contenido antes de procesar:', args.content);
              
              args.content = args.content.replace(/style="[^"]*"/gi, '');
              args.content = args.content.replace(/class="[^"]*"/gi, '');
              args.content = args.content.replace(/font-family:[^;]*;?/gi, '');
              args.content = args.content.replace(/font-size:[^;]*;?/gi, '');
              args.content = args.content.replace(/color:[^;]*;?/gi, '');
              args.content = args.content.replace(/background-color:[^;]*;?/gi, '');
              
              args.content = args.content.replace(/<h[3-5][^>]*>/gi, '<p>');
              args.content = args.content.replace(/<\/h[3-5]>/gi, '</p>');
              
              args.content = args.content.replace(/<(div|span|section|article)[^>]*>/gi, '<p>');
              args.content = args.content.replace(/<\/(div|span|section|article)>/gi, '</p>');
              
              console.log('Contenido después de procesar:', args.content);
            },
            
            paste_postprocess: function(plugin, args) {
              const doc = args.node.ownerDocument;
              const paragraphs = args.node.querySelectorAll('p');
              
              paragraphs.forEach(p => {
                p.style.fontFamily = 'Linotype Devanagari';
                p.style.fontSize = '13pt';
                p.style.margin = '0';
                p.style.padding = '0';
              });
              
              const h1Elements = args.node.querySelectorAll('h1');
              h1Elements.forEach(h1 => {
                h1.style.fontFamily = 'Pentay Bold';
                h1.style.fontSize = '18pt';
                h1.style.fontWeight = 'bold';
              });
              
              const h2Elements = args.node.querySelectorAll('h2');
              h2Elements.forEach(h2 => {
                h2.style.fontFamily = 'Pentay Bold';
                h2.style.fontSize = '17pt';
                h2.style.fontWeight = 'bold';
                h2.style.fontStyle = 'italic';
              });
              
              const h6Elements = args.node.querySelectorAll('h6');
              h6Elements.forEach(h6 => {
                h6.style.fontFamily = 'MVB Dovetail Light Italic';
                h6.style.fontSize = '13.5pt';
                h6.style.color = 'black';
                h6.style.backgroundColor = '#f0f0f0';
                h6.style.textIndent = '0.2in';
              });
              
              const preElements = args.node.querySelectorAll('pre');
              preElements.forEach(pre => {
                pre.style.fontFamily = 'Times New Roman';
                pre.style.fontSize = '9pt';
                pre.style.color = 'gray';
                pre.style.textAlign = 'center';
                pre.style.whiteSpace = 'normal';
                pre.style.wordBreak = 'break-word';
              });
              
              const blockquoteElements = args.node.querySelectorAll('blockquote');
              blockquoteElements.forEach(blockquote => {
                blockquote.style.fontFamily = 'MVB Dovetail Light Italic';
                blockquote.style.fontSize = '13.5pt';
                blockquote.style.color = 'black';
                blockquote.style.backgroundColor = '#f0f0f0';
              });
            },

            block_formats: 'Párrafo=p; Heading 1=h1; Heading 2=h2; Citas=h6; Información Adicional=pre',

            plugins: [
              'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview', 'anchor',
              'searchreplace', 'visualblocks', 'code', 'fullscreen',
              'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount',
              'image', 'paste'
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
        font-family: 'Linotype Devanagari' !important;
        font-size: 13pt !important;
        margin: 0;
        white-space: normal;
        word-break: break-word;
        position: relative;
        z-index: 1;
      }

      /* Estilos para elementos con formato dentro de párrafos */
      p strong, p b {
        font-family: 'Linotype Devanagari' !important;
        font-size: 13pt !important;
        font-weight: bold !important;
      }

      p em, p i {
        font-family: 'Linotype Devanagari' !important;
        font-size: 13pt !important;
        font-style: italic !important;
      }

      p u {
        font-family: 'Linotype Devanagari' !important;
        font-size: 13pt !important;
        text-decoration: underline !important;
      }

      /* Estilos para H1 con formatos */
      h1 {
        font-family: 'Pentay Bold' !important;
        font-size: 18pt !important;
        font-weight: bold !important;
        position: relative;
        z-index: 1;
      }

      h1 strong, h1 b {
        font-family: 'Pentay Bold' !important;
        font-size: 18pt !important;
        font-weight: bold !important;
      }

      h1 em, h1 i {
        font-family: 'Pentay Bold' !important;
        font-size: 18pt !important;
        font-style: italic !important;
        font-weight: bold !important;
      }

      h1 u {
        font-family: 'Pentay Bold' !important;
        font-size: 18pt !important;
        text-decoration: underline !important;
        font-weight: bold !important;
      }

      /* Estilos para H2 con formatos */
      h2 {
        font-family: 'Pentay Bold' !important;
        font-size: 17pt !important;
        font-weight: bold !important;
        font-style: italic !important;
        position: relative;
        z-index: 1;
      }

      h2 strong, h2 b {
        font-family: 'Pentay Bold' !important;
        font-size: 17pt !important;
        font-weight: bold !important;
        font-style: italic !important;
      }

      h2 em, h2 i {
        font-family: 'Pentay Bold' !important;
        font-size: 17pt !important;
        font-style: italic !important;
        font-weight: bold !important;
      }

      h2 u {
        font-family: 'Pentay Bold' !important;
        font-size: 17pt !important;
        text-decoration: underline !important;
        font-weight: bold !important;
        font-style: italic !important;
      }

      /* Estilos para H6 con formatos */
      h6 {
        font-family: 'MVB Dovetail Light Italic' !important;
        font-size: 13.5pt !important;
        color: black !important;
        background-color: #f0f0f0 !important;
        text-indent: 0.2in !important;
        position: relative;
        z-index: 1;
      }

      h6 strong, h6 b {
        font-family: 'MVB Dovetail Light Italic' !important;
        font-size: 13.5pt !important;
        font-weight: bold !important;
        color: black !important;
        background-color: #f0f0f0 !important;
      }

      h6 em, h6 i {
        font-family: 'MVB Dovetail Light Italic' !important;
        font-size: 13.5pt !important;
        font-style: italic !important;
        color: black !important;
        background-color: #f0f0f0 !important;
      }

      h6 u {
        font-family: 'MVB Dovetail Light Italic' !important;
        font-size: 13.5pt !important;
        text-decoration: underline !important;
        color: black !important;
        background-color: #f0f0f0 !important;
      }

      /* Estilos para PRE con formatos */
      pre {
        font-family: 'Times New Roman' !important;
        font-size: 9pt !important;
        color: gray !important;
        text-align: center !important;
        margin-top: 0px !important;
        margin-bottom: 20px !important;
        position: relative;
        z-index: 1;
        white-space: normal !important;
        word-break: break-word !important;
        overflow-wrap: break-word !important;
        box-sizing: border-box !important;
        max-width: 100% !important;
        display: block !important;
      }

      pre strong, pre b {
        font-family: 'Times New Roman' !important;
        font-size: 9pt !important;
        font-weight: bold !important;
        color: gray !important;
      }

      pre em, pre i {
        font-family: 'Times New Roman' !important;
        font-size: 9pt !important;
        font-style: italic !important;
        color: gray !important;
      }

      pre u {
        font-family: 'Times New Roman' !important;
        font-size: 9pt !important;
        text-decoration: underline !important;
        color: gray !important;
      }

      /* Estilos para BLOCKQUOTE con formatos */
      blockquote {
        font-family: 'MVB Dovetail Light Italic' !important;
        font-size: 13.5pt !important;
        color: black !important;
        background-color: #f0f0f0 !important;
        position: relative;
        z-index: 1;
      }

      blockquote strong, blockquote b {
        font-family: 'MVB Dovetail Light Italic' !important;
        font-size: 13.5pt !important;
        font-weight: bold !important;
        color: black !important;
        background-color: #f0f0f0 !important;
      }

      blockquote em, blockquote i {
        font-family: 'MVB Dovetail Light Italic' !important;
        font-size: 13.5pt !important;
        font-style: italic !important;
        color: black !important;
        background-color: #f0f0f0 !important;
      }

      blockquote u {
        font-family: 'MVB Dovetail Light Italic' !important;
        font-size: 13.5pt !important;
        text-decoration: underline !important;
        color: black !important;
        background-color: #f0f0f0 !important;
      }

      .news-detail-container {
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
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
        
        body:before, body:after {
          display: none;
        }

        pre {
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
        
        body:before, body:after {
          display: none;
        }
        
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
              editor.on('PastePreProcess', function(e) {
                console.log('Paste detected - cleaning content');
                
                let content = e.content;
                
                content = content.replace(/style="[^"]*"/gi, '');
                content = content.replace(/class="[^"]*"/gi, '');
                content = content.replace(/font-[^=]*="[^"]*"/gi, '');
                
                content = content.replace(/<(div|span|section|article)[^>]*>/gi, '<p>');
                content = content.replace(/<\/(div|span|section|article)>/gi, '</p>');
                
                content = content.replace(/<p><\/p>/gi, '');
                content = content.replace(/<p>\s*<\/p>/gi, '');
                
                e.content = content;
              });
              
              editor.on('PastePostProcess', function(e) {
                setTimeout(() => {
                  const pastedContent = e.node;
                  
                  const allElements = pastedContent.querySelectorAll('*');
                  allElements.forEach(el => {
                    if (!['H1', 'H2', 'H6', 'PRE', 'BLOCKQUOTE', 'IMG', 'A', 'STRONG', 'EM', 'U', 'BR'].includes(el.tagName)) {
                      if (el.tagName === 'P' || el.innerHTML.trim()) {
                        el.style.fontFamily = 'Linotype Devanagari';
                        el.style.fontSize = '13pt';
                        el.style.margin = '0';
                        el.style.padding = '0';
                      }
                    }
                  });
                  
                  editor.fire('change');
                }, 100);
              });

              editor.ui.registry.addButton('formatselect', {
                text: 'Párrafo',
                tooltip: 'Formato',
                onAction: function () {
                  editor.execCommand('mceToggleFormat');
                }
              });
              
              editor.on('BeforeExecCommand', function(e) {
                if (e.command === 'RemoveFormat') {
                  const selectedNode = editor.selection.getNode();
                  const selectedContent = editor.selection.getContent();
                  const selectedRange = editor.selection.getRng();
                  
                  setTimeout(function() {
                    editor.formatter.apply('p');
                    
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
              
              editor.on('BeforeSetContent', function (e) {
                if (e.format === 'html') {
                  e.content = e.content.replace(/<h1([^>]*)>/gi, '<h1$1 style="font-family: Pentay Bold !important; font-size: 18pt !important; font-weight: bold !important;">');
                  e.content = e.content.replace(/<h2([^>]*)>/gi, '<h2$1 style="font-family: Pentay Bold !important; font-size: 17pt !important; font-weight: bold !important; font-style: italic !important;">');
                  e.content = e.content.replace(/<h6([^>]*)>/gi, '<h6$1 style="font-family: MVB Dovetail Light Italic !important; font-size: 13.5pt !important; color: black !important; background-color: #f0f0f0 !important; text-indent: 0.2in !important;">');
                  e.content = e.content.replace(/<blockquote([^>]*)>/gi, '<blockquote$1 style="font-family: MVB Dovetail Light Italic !important; font-size: 13.5pt !important; color: black !important; background-color: #f0f0f0 !important;">');
                  e.content = e.content.replace(/<pre([^>]*)>/gi, '<pre$1 style="font-family: Times New Roman !important; font-size: 9pt !important; color: gray !important;">');
                  
                  e.content = e.content.replace(/<p([^>]*)>/gi, '<p$1 style="font-family: Linotype Devanagari !important; font-size: 13pt !important; margin: 0 !important;">');
                }
              });

              editor.on('NodeChange', function (e) {
                const { nodeName, style } = e.element;
                
                const cleanFormattedElements = (element) => {
                  const formattedElements = element.querySelectorAll('strong, b, em, i, u');
                  formattedElements.forEach(el => {
                    el.style.fontFamily = '';
                    el.style.fontSize = '';
                    el.style.color = '';
                    el.style.backgroundColor = '';
                  });
                };
                
                if (nodeName === 'H1') {
                  e.element.style.fontFamily = 'Pentay Bold !important';
                  e.element.style.fontSize = '18pt !important';
                  e.element.style.fontWeight = 'bold !important';
                  cleanFormattedElements(e.element);
                } else if (nodeName === 'H2') {
                  e.element.style.fontFamily = 'Pentay Bold !important';
                  e.element.style.fontSize = '17pt !important';
                  e.element.style.fontWeight = 'bold !important';
                  e.element.style.fontStyle = 'italic !important';
                  cleanFormattedElements(e.element);
                } else if (nodeName === 'H6') {
                  e.element.style.fontFamily = 'MVB Dovetail Light Italic !important';
                  e.element.style.fontSize = '13.5pt !important';
                  e.element.style.color = 'black !important';
                  e.element.style.backgroundColor = '#f0f0f0 !important';
                  e.element.style.textIndent = '0.2in !important';
                  cleanFormattedElements(e.element);
                } else if (nodeName === 'P') {
                  e.element.style.fontFamily = 'Linotype Devanagari !important';
                  e.element.style.fontSize = '13pt !important';
                  e.element.style.margin = '0 !important';
                  cleanFormattedElements(e.element);
                } else if (nodeName === 'PRE') {
                  e.element.style.fontFamily = 'Times New Roman !important';
                  e.element.style.fontSize = '9pt !important';
                  e.element.style.color = 'gray !important';
                  cleanFormattedElements(e.element);
                } else if (nodeName === 'BLOCKQUOTE') {
                  e.element.style.fontFamily = 'MVB Dovetail Light Italic !important';
                  e.element.style.fontSize = '13.5pt !important';
                  e.element.style.color = 'black !important';
                  e.element.style.backgroundColor = '#f0f0f0 !important';
                  cleanFormattedElements(e.element);
                }
                
                if (['STRONG', 'B', 'EM', 'I', 'U'].includes(nodeName)) {
                  e.element.style.fontFamily = '';
                  e.element.style.fontSize = '';
                  e.element.style.color = '';
                  e.element.style.backgroundColor = '';
                }
              });

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
                
                const clearFormatButton = editor.editorContainer.querySelector('[title="Clear formatting"]');
                if (clearFormatButton) {
                  clearFormatButton.addEventListener('mousedown', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    
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

              editor.on('keydown', function (e) {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  
                  const currentNode = editor.selection.getNode();
                  
                  const styles = window.getComputedStyle(currentNode);
                  const backgroundColor = styles.backgroundColor;
                  const color = styles.color;
                  const fontFamily = currentNode.style.fontFamily || styles.fontFamily || 'Linotype Devanagari';
                  
                  const nodeName = currentNode.nodeName.toLowerCase();
                  
                  if (['h1', 'h2', 'h6', 'pre', 'blockquote'].includes(nodeName)) {
                    editor.insertContent('<p style="margin: 0; padding: 0; font-family: Linotype Devanagari; font-size: 13pt;">\u200B</p>');
                  } else {
                    const bgColorStyle = backgroundColor && backgroundColor !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'transparent' 
                      ? `background-color: ${backgroundColor};` 
                      : '';
                    
                    const textColorStyle = color && color !== 'rgba(0, 0, 0, 0)' 
                      ? `color: ${color};` 
                      : '';
                    
                    editor.insertContent(`<p style="margin: 0; padding: 0; font-family: ${fontFamily}; font-size: 13pt; ${bgColorStyle} ${textColorStyle}">\u200B</p>`);
                  }
                  
                  editor.execCommand('FormatBlock', false, 'p');
                  
                  const newNode = editor.selection.getNode();
                  if (newNode) {
                    const rng = editor.selection.getRng();
                    rng.setStart(newNode, 0);
                    rng.setEnd(newNode, 0);
                    editor.selection.setRng(rng);
                  }
                  
                  editor.focus();
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