import React, { useState, useRef } from "react";
import { PDFDocument } from "pdf-lib";
import "../styles/merge.css";

import {
  DndContext,
  closestCenter
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

function SortableItem({ id, fileData, index, onDelete }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="file-item"
    >
      <div
        className="drag-handle"
        {...attributes}
        {...listeners}
      >
        📄 {fileData.file.name}
      </div>

      <div className="file-actions">

        <button
          type="button"
          className="preview-btn"
          onClick={(e) => {
            e.stopPropagation();
            window.open(fileData.preview, "_blank");
          }}
        >
          👁
        </button>

        <button
          type="button"
          className="delete-btn"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(index);
          }}
        >
          🗑
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

  /* ===============================
     ADD FILES
     =============================== */

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;

    const newFiles = Array.from(fileList).map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));

    setFiles(prev => [...prev, ...newFiles]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  /* ===============================
     HOME RESET
     =============================== */

  const goHome = () => {
    setFiles([]);
    setStatus("idle");
    setProgress(0);
  };

  /* ===============================
     DELETE WITH CONFIRM
     =============================== */

  const confirmDelete = (index: number) => {
    const confirmed = window.confirm("¿Eliminar este PDF?");
    if (confirmed) {
      setFiles(prev => prev.filter((_, i) => i !== index));
    }
  };

  /* ===============================
     DRAG & DROP
     =============================== */

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (!over) return;

    if (active.id !== over.id) {
      setFiles((items) => {
        const oldIndex = items.findIndex(f => f.file.name === active.id);
        const newIndex = items.findIndex(f => f.file.name === over.id);
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
      [new Uint8Array(mergedBytes)],
      { type: "application/pdf" }
    );

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "MergeIt_unido.pdf";
    a.click();

    URL.revokeObjectURL(url);

    setStatus("done");
    }; 
  /* ===============================
     UI
     =============================== */

  return (
    <div className="app-full">

      {/* TOP BAR */}
      <div className="top-bar">

        <button className="home-badge" onClick={goHome}>
          HOME
        </button>

        <div className="progress-container">
          <span className="progress-label">Merge PDFs</span>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="level-badge">
          {files.length} PDFs
        </div>

      </div>

      {/* LEFT BUTTON */}
      <button
        className="side-btn left"
        onClick={() => fileInputRef.current?.click()}
      >
        ⭐ Agregar más PDF
      </button>

      {/* RIGHT BUTTON */}
      <button
        className="side-btn right"
        onClick={mergePDFs}
      >
        Merge It
      </button>

      {/* CENTER CARD */}
      <div className="quiz-card">

        <div className="dino-avatar">
          🦖
        </div>

        {files.length === 0 ? (
          <>
            <h2 className="card-title">
              Agrega tus PDFs
            </h2>
            <p className="empty-description">
              Usa el botón de la estrella para comenzar.
            </p>
          </>
        ) : (
          <>
            <h2 className="card-title">
              Arrastra para ordenar
            </h2>

            <DndContext
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={files.map(f => f.file.name)}
                strategy={verticalListSortingStrategy}
              >
                <div className="file-options">
                  {files.map((fileData, i) => (
                    <SortableItem
                      key={fileData.file.name}
                      id={fileData.file.name}
                      fileData={fileData}
                      index={i}
                      onDelete={confirmDelete}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

          </>
        )}

        {status === "merging" && (
          <div className="merging-text">
            Merging... {progress}%
          </div>
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

    </div>
  );
}
