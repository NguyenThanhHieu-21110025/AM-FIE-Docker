import "../../css/Modal.css";
import { ReactNode, useEffect } from "react";
import { FaTimes } from "react-icons/fa";

interface Props {
  title: string;
  children: ReactNode;
  onClose: () => void;
  maxWidth?: string;
}

const Modal = ({ title, children, onClose, maxWidth = "500px" }: Props) => {
  // Close modal with Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    
    document.addEventListener("keydown", handleKeyDown);
    
    // Prevent body scrolling when modal is open
    document.body.style.overflow = "hidden";
    
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "auto";
    };
  }, [onClose]);
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()} 
        style={{ maxWidth }}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            <FaTimes size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default Modal;
