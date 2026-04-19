import React, { useRef, useState } from 'react';

import { Btn } from '../../../../components/ui';
import { CRUDHandlers, EntityConfig, ID } from '../../config/types';
import { CRUDFormModal } from './CRUDFormModal';
import { CRUDTable } from './CRUDTable';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';

type CRUDPageShellProps<T extends { id: ID }> = {
  config: EntityConfig<T>;
  handlers: CRUDHandlers<T>;
  onBack?: () => void;
};

export function CRUDPageShell<T extends { id: ID }>({
  config,
  handlers,
  onBack,
}: CRUDPageShellProps<T>) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<T | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const canEdit = config.canEdit !== false;
  const canDelete = config.canDelete !== false;

  const handleCreate = () => {
    setSelectedItem(null);
    setIsFormOpen(true);
  };

  const handleEdit = (item: T) => {
    setSelectedItem(item);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (item: T) => {
    setSelectedItem(item);
    setIsDeleteOpen(true);
  };

  const handleSubmit = async (data: Partial<T>) => {
    if (selectedItem) {
      await handlers.onUpdate(selectedItem.id, data);
    } else {
      await handlers.onCreate(data);
    }
    setIsFormOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (selectedItem) {
      await handlers.onDelete(selectedItem.id);
      setIsDeleteOpen(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && handlers.onImport) {
      await handlers.onImport(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 24,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            {onBack && (
              <Btn disabled={false} block={false} variant="ghost" onClick={onBack}>
                ← Back
              </Btn>
            )}
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, fontFamily: 'var(--fd)' }}>
              {config.entityLabelPlural}
            </h1>
          </div>
          <div style={{ color: 'var(--txt2)', fontSize: 13.5, lineHeight: 1.5 }}>
            Manage {config.entityLabelPlural.toLowerCase()} in the system.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          {config.bulkImport && handlers.onImport && (
            <>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
              />
              <Btn disabled={false} block={false} variant="outline" onClick={handleImportClick}>
                Import
              </Btn>
              <Btn
                disabled={false}
                block={false}
                variant="outline"
                onClick={() => window.open(`/templates/${config.importTemplatePrefix}.xlsx`)}
              >
                Template
              </Btn>
            </>
          )}
          {canEdit && (
            <Btn disabled={false} block={false} variant="primary" onClick={handleCreate}>
              + Add {config.entityLabel}
            </Btn>
          )}
        </div>
      </div>

      {(config.paginated || config.searchableFields?.length) && (
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: 300 }}>
            <input
              type="text"
              value={handlers.search}
              onChange={(e) => handlers.setSearch(e.target.value)}
              placeholder="Search..."
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid var(--bdr)',
                fontSize: 14,
              }}
            />
          </div>
        </div>
      )}

      <CRUDTable
        columns={config.columns}
        items={handlers.items}
        isLoading={handlers.isLoading}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
        canEdit={canEdit}
        canDelete={canDelete}
      />

      {config.paginated && handlers.totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 16,
          }}
        >
          <div style={{ fontSize: 13, color: 'var(--txt2)' }}>
            Showing page {handlers.page} of {handlers.totalPages}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn
              block={false}
              variant="outline"
              size="xs"
              disabled={handlers.page <= 1}
              onClick={() => handlers.setPage(Math.max(1, handlers.page - 1))}
            >
              Previous
            </Btn>
            <Btn
              block={false}
              variant="outline"
              size="xs"
              disabled={handlers.page >= handlers.totalPages}
              onClick={() => handlers.setPage(handlers.page + 1)}
            >
              Next
            </Btn>
          </div>
        </div>
      )}

      {isFormOpen && (
        <CRUDFormModal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleSubmit}
          config={config}
          initialValues={selectedItem || undefined}
          isSubmitting={selectedItem ? handlers.isUpdating : handlers.isCreating}
          mode={selectedItem ? 'edit' : 'create'}
        />
      )}

      {isDeleteOpen && (
        <DeleteConfirmDialog
          isOpen={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
          onConfirm={handleConfirmDelete}
          entityLabel={config.entityLabel}
          isDeleting={handlers.isDeleting}
        />
      )}
    </div>
  );
}
