import React, { useRef, useState } from 'react';

export interface WorldUploadProps {
    canUpload: boolean;
    isUploading: boolean;
    onUpload: (file: File) => void;
    error?: string | null;
    onRequestStopMessage?: string;
}

export const WorldUpload: React.FC<WorldUploadProps> = ({
    canUpload,
    isUploading,
    onUpload,
    error,
    onRequestStopMessage = 'Stop the server before importing a world.',
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const triggerFileDialog = (): void => {
        if (!canUpload) {
            return;
        }

        fileInputRef.current?.click();
    };

    const onFileSelected = (event: React.ChangeEvent<HTMLInputElement>): void => {
        const file = event.target.files?.[0];
        if (file != null) {
            onUpload(file);
        }
        event.target.value = '';
    };

    const onDrop = (event: React.DragEvent<HTMLDivElement>): void => {
        event.preventDefault();
        setIsDragging(false);
        if (!canUpload) {
            return;
        }

        const file = event.dataTransfer.files?.[0];
        if (file != null) {
            onUpload(file);
        }
    };

    const onDrag = (event: React.DragEvent<HTMLDivElement>): void => {
        event.preventDefault();
        if (!canUpload) {
            return;
        }

        setIsDragging(event.type === 'dragover');
    };

    return (
        <>
            <div
                className={`crankshaft-world-upload ${isDragging ? 'is-dragging' : ''} ${
                    canUpload ? '' : 'is-disabled'
                }`}
                role="button"
                tabIndex={0}
                onClick={triggerFileDialog}
                onDragOver={onDrag}
                onDragLeave={onDrag}
                onDrop={onDrop}
                onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        triggerFileDialog();
                    }
                }}
            >
                <p>{canUpload ? 'Drag & drop a .mcworld file here or click to browse.' : onRequestStopMessage}</p>
                <button
                    type="button"
                    className="nes-btn is-primary"
                    onClick={(event) => {
                        event.stopPropagation();
                        triggerFileDialog();
                    }}
                    disabled={!canUpload || isUploading}
                >
                    {isUploading ? 'Uploading...' : 'Select World File'}
                </button>
                <input ref={fileInputRef} type="file" accept=".mcworld" hidden onChange={onFileSelected} />
            </div>
            {error && <p className="nes-text is-error">{error}</p>}
        </>
    );
};
