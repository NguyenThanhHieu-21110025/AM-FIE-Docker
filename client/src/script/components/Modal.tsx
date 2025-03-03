import "../../css/Modal.css";
import { ReactNode } from "react";
import { FaTimes } from "react-icons/fa";

interface Props {
  title: string;
  children: ReactNode;
  onClose: () => void;
}

const Modal = ({ title, children, onClose }: Props) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="close-btn" onClick={onClose}>
            <FaTimes size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default Modal;