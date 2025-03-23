import React, { useEffect, useRef } from 'react';

const FacebookComments = ({ url, numPosts, width, canDeleteComments, onDeleteComment }) => {
  const commentsRef = useRef(null);

  useEffect(() => {
    if (window.FB) {
      window.FB.XFBML.parse(commentsRef.current);
    }
  }, []);

  const handleDeleteComment = (commentId) => {
    if (onDeleteComment) {
      onDeleteComment(commentId);
    }
  };

  return (
    <div ref={commentsRef}>
      <div className="fb-comments"
        data-href={url}
        data-width={width || "100%"}
        data-numposts={numPosts || "5"}>
      </div>
      {canDeleteComments && (
        <div className="comment-management">
          <p>As a worker, you can delete comments. Click on a comment and then the delete button to remove it.</p>
        </div>
      )}
    </div>
  );
};

export default FacebookComments;
