'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import styles from './TestInstructionsModal.module.css';

export default function TestInstructionsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleOpen = () => {
    setIsOpen(true);
    if (!content && !isLoading) {
      setIsLoading(true);
      fetch('/api/docs/how-to-test')
        .then(res => res.json())
        .then(data => {
          setContent(data.content);
          setIsLoading(false);
        })
        .catch(err => {
          console.error(err);
          setContent('Failed to load instructions.');
          setIsLoading(false);
        });
    }
  };

  // Prevent scrolling on body when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <div className={styles.container}>
      <button 
        className={styles.link}
        onClick={handleOpen}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
        How to test this
      </button>

      {isOpen && (
        <div className={styles.overlay} onClick={() => setIsOpen(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={() => setIsOpen(false)} aria-label="Close">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <div className={styles.markdownContent}>
              {isLoading && <p>Loading instructions...</p>}
              {content && <ReactMarkdown>{content}</ReactMarkdown>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
