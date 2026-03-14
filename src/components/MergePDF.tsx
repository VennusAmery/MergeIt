import React, { useState, useRef } from "react";
import { PDFDocument } from "pdf-lib";
import "../styles/merge.css";
import dinoImg from '../Img/dinosaurio.png';
import borrarImg from '../Img/borrar.png';
import vistaImg from '../Img/vista.png';

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors
} from "@dnd-kit/core";

import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

/* ===============================
   SORTABLE ITEM
   =============================== */
function SortableItem({ id, fileData, onDelete, onPreview }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`file-item ${isDragging ? "dragging" : ""}`}
    >
      <div className="drag-handle" {...attributes} {...listeners}>
        <span className="file-icon">📄</span>
        <span className="file-name">{fileData.file.name}</span>
      </div>

      <div className="file-actions">
        <button 
          type="button" 
          className="preview-btn" 
          onPointerDown={(e) => e.stopPropagation()} 
          onClick={() => onPreview(fileData.preview)}
        >
          <img src={vistaImg} alt="Ver" style={{ width: '18px', height: '18px' }} />
        </button>

        <button 
          type="button" 
          className="delete-btn" 
          onPointerDown={(e) => e.stopPropagation()} 
          onClick={() => onDelete(id)}
        >
          <img src={borrarImg} alt="Eliminar" style={{ width: '18px', height: '18px' }} />
        </button>
      </div>
    </div>
  );
}

/* ==============================
   MAIN COMPONENT
   =============================== */

export default function MergePDF() {
  const [files, setFiles] = useState<any[]>([]);
  const [status, setStatus] = useState<"idle" | "merging" | "done">("idle");
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 }, 
    })
  );

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  /* ===============================
     ACCIONES (Añadir, Eliminar, Home)
     =============================== */
  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const newFiles = Array.from(fileList).map(file => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      preview: URL.createObjectURL(file)
    }));
    setFiles(prev => [...prev, ...newFiles]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

const [isDragOver, setIsDragOver] = useState(false);

const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
  e.preventDefault();
  e.stopPropagation();
  setIsDragOver(false);
  handleFiles(e.dataTransfer.files);
};

const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
  e.preventDefault();
  
  // Solo activar si es un PDF
  const items = Array.from(e.dataTransfer.items);
  const hasPDF = items.some(item => item.type === "application/pdf");
  
  if (hasPDF) {
    setIsDragOver(true);
  }
};

const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
  // Solo cuando salís completamente del contenedor
  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
    setIsDragOver(false);
  }
};

  const goHome = () => {
    setFiles([]);
    setStatus("idle");
    setProgress(0);
  };

  const [confirmId, setConfirmId] = useState<string | null>(null);

  const confirmDelete = (id: string) => {
    setConfirmId(id);
  };

  /* ===============================
     DRAG & DROP LOGIC
     =============================== */
  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setFiles((items) => {
        const oldIndex = items.findIndex(f => f.id === active.id);
        const newIndex = items.findIndex(f => f.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  /* ===============================
     MERGE PDFs 
     =============================== */
  const mergePDFs = async () => {
    if (files.length < 2) {
      alert("Necesitas al menos 2 PDFs.");
      return;
    }

    setStatus("merging");
    setProgress(0);

    try {
      const mergedPdf = await PDFDocument.create();

      for (let i = 0; i < files.length; i++) {
        const bytes = await files[i].file.arrayBuffer();
        const pdf = await PDFDocument.load(bytes);
        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        pages.forEach(page => mergedPdf.addPage(page));
        setProgress(Math.round(((i + 1) / files.length) * 100));
      }

      const mergedBytes = await mergedPdf.save();
      const blob = new Blob(
        [mergedBytes as BlobPart], 
        { type: "application/pdf" }
      );
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "MergeIt_unido.pdf";
      a.click();

      URL.revokeObjectURL(url);
      setStatus("done");
    } catch (error) {
      console.error("Error merging PDFs:", error);
      alert("Ocurrió un error al unir los archivos.");
      setStatus("idle");
    }
  };

  /* ===============================
     UI / RENDER
     =============================== */
  return (
      <div 
        className="app-full"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
         onDragLeave={handleDragLeave}
      >
  
      {/* BARRA SUPERIOR */}
      <div className="top-bar">
        <button className="home-badge" onClick={goHome}>HOME</button>
        <div className="progress-container">
          <span className="progress-label">Merge PDFs</span>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="level-badge">{files.length} PDFs</div>
      </div>

      {/* BOTONES LATERALES */}
      <button className="side-btn left" onClick={() => fileInputRef.current?.click()}>
        ⭐ Agregar más PDF
      </button>

      <button className="side-btn right" onClick={mergePDFs}>
        Merge It
      </button>

      {/* TARJETA CENTRAL */}
      <div className="quiz-card">
        <div className="dino-avatar">
          <img src={dinoImg} alt="Dinosaurio" style={{ width: '70%', height: 'auto' }} />
        </div>

        {files.length === 0 ? (
          <>
            <h2 className="card-title">Agrega tus PDFs</h2>
            <p className="empty-description">Usa el botón de la estrella para comenzar o arrastra tus pdfs</p>
          </>
        ) : (
          <>
            <h2 className="card-title">Arrastra para ordenar</h2>
            <DndContext 
              sensors={sensors} 
              collisionDetection={closestCenter} 
              onDragEnd={handleDragEnd}
            >
              <SortableContext 
                items={files.map(f => f.id)} 
                strategy={verticalListSortingStrategy}
              >
                <div className="file-options">
                  {files.map((fileData) => (
                    <SortableItem
                      key={fileData.id}
                      id={fileData.id}
                      fileData={fileData}
                      onDelete={confirmDelete}
                      onPreview={setPreviewUrl} 
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </>
        )}

        {status === "merging" && (
          <div className="merging-text">Merging... {progress}%</div>
        )}
      </div>

      <input 
        type="file" 
        multiple 
        accept="application/pdf" 
        hidden 
        ref={fileInputRef} 
        onChange={handleInputChange} 
      />

      {isDragOver && (
        <div className="drop-overlay">
          <p className="drop-overlay-text">¡Suéltalo! 🎯</p>
        </div>
      )}

      {previewUrl && (
        <div className="preview-overlay" onClick={() => setPreviewUrl(null)}>
          <div className="preview-box" onClick={(e) => e.stopPropagation()}>
            <button className="preview-close" onClick={() => setPreviewUrl(null)}>✕</button>
            <iframe src={previewUrl} className="preview-iframe" title="Vista previa PDF" />
          </div>
        </div>
      )}

      {confirmId && (
        <div className="confirm-overlay">
          <div className="confirm-box">
            <p className="confirm-text">¿Eliminar este PDF?</p>
            <div className="confirm-actions">
              <button className="confirm-cancel" onClick={() => setConfirmId(null)}>
                Cancelar
              </button>
              <button className="confirm-delete" onClick={() => {
                setFiles(prev => prev.filter(f => f.id !== confirmId));
                setConfirmId(null);
              }}>
                Eliminar 🗑
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}