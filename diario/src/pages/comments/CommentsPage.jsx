import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Form, Input, Button, List, message, Popconfirm } from 'antd';
import axios from 'axios';
import { useUser } from '../context/UserContext'; // Adjust the path as needed
import  api from '../context/axiosConfig';
const { TextArea } = Input;

const CommentsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [comments, setComments] = useState([]);
  const [form] = Form.useForm();
  const { user, loading } = useUser();

  // Use the UserContext for authentication
  useEffect(() => {
    // If loading is complete and user isn't authenticated or is not a worker, redirect
    if (!loading && (!user || !user.trabajador)) {
      navigate('/login');
      return;
    }

    if (user) {
      fetchComments();
    }
  }, [user, loading, id, navigate]);

  const fetchComments = async () => {
    try {
      console.log(`Fetching comments for ID: ${id}`);
      
      // Usar api en lugar de axios y la URL completa
      const response = await api.get(`noticias/${id}/comentarios/`);
      
      setComments(response.data);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
      message.error('Failed to fetch comments');
      
      // If we get a 401, redirect to login
      if (error.response && error.response.status === 401) {
        navigate('/login');
      }
    }
  };

  const onFinish = async (values) => {
    if (!user) {
      message.error('You must be logged in to comment');
      navigate('/login');
      return;
    }

    try {
      const accessToken = localStorage.getItem('access');
      await api.post(
        `noticias/${id}/comentarios/`, 
        {
          noticia: id,
          contenido: values.comment,
          autor: user.id || 'Anonymous',
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );
      
      message.success('Comment added successfully');
      form.resetFields();
      fetchComments();
    } catch (error) {
      console.error('Failed to add comment:', error);
      message.error('Failed to add comment');
      
      // If we get a 401, redirect to login
      if (error.response && error.response.status === 401) {
        navigate('/login');
      }
    }
  };

  const handleDelete = async (commentId) => {
    try {
      const accessToken = localStorage.getItem('access');
      await api.delete(
        `noticias/${id}/comentarios/${commentId}/`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );
      
      setComments(prevComments => prevComments.filter(comment => comment.id !== commentId));
      message.success('Comment deleted successfully');
    } catch (error) {
      console.error('Failed to delete comment:', error);
      message.error('Failed to delete comment');
      
      // If we get a 401, redirect to login
      if (error.response && error.response.status === 401) {
        navigate('/login');
      }
    }
  };

  // If still loading, show loading state
  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Comments for News ID: {id}</h1>
      <Form form={form} onFinish={onFinish}>
        <Form.Item name="comment" rules={[{ required: true, message: 'Please enter a comment' }]}>
          <TextArea rows={4} placeholder="Add your comment..." />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit">
            Add Comment
          </Button>
        </Form.Item>
      </Form>
      <List
        itemLayout="horizontal"
        dataSource={comments}
        renderItem={item => (
          <List.Item
            actions={[
              <Popconfirm
                title="Are you sure to delete this comment?"
                onConfirm={() => handleDelete(item.id)}
                okText="Yes"
                cancelText="No"
              >
                <Button type="link" danger>Delete</Button>
              </Popconfirm>
            ]}
          >
            <List.Item.Meta
              title={user ? `${user.nombre} ${user.apellido} (ID: ${user.id})` : 'Anonymous'}
              description={item.contenido}
            />
            <div>{new Date(item.fecha_creacion).toLocaleString()}</div>
          </List.Item>
        )}
      />
    </div>
  );
};

export default CommentsPage;