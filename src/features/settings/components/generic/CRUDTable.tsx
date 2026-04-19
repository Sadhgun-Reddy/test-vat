import { Card } from '../../../../components/ui'; // assuming basic Card exists or using simple div
import { Btn } from '../../../../components/ui'; // adjust path
import LoadingSpinner from '../../../../components/ui/LoadingSpinner'; // fallback or adjust path
import { ColumnDef, ID } from '../../config/types';

type CRUDTableProps<T extends { id: ID }> = {
  columns: ColumnDef<T>[];
  items: T[];
  isLoading: boolean;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  canEdit?: boolean;
  canDelete?: boolean;
};

export function CRUDTable<T extends { id: ID }>({
  columns,
  items,
  isLoading,
  onEdit,
  onDelete,
  canEdit = true,
  canDelete = true,
}: CRUDTableProps<T>) {
  if (isLoading) {
    return (
      <div className="p-8 flex justify-center">
        <LoadingSpinner fullPage={false} />
      </div>
    );
  }

  if (!items?.length) {
    return (
      <Card style={{}}>
        <div className="p-8 text-center text-gray-500">No records found</div>
      </Card>
    );
  }

  const showActions = canEdit || canDelete;

  return (
    <Card style={{}}>
      <div style={{ overflowX: 'auto' }}>
        <table className="table" style={{ minWidth: 600 }}>
          <thead>
            <tr>
              {columns.map((col, i) => (
                <th key={String(col.key) + i} style={{ width: col.width }}>
                  {col.header}
                </th>
              ))}
              {showActions && <th style={{ width: 120, textAlign: 'right' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={String(row.id)}>
                {columns.map((col, i) => {
                  const val = row[col.key as keyof T];
                  return (
                    <td key={String(col.key) + i}>
                      {col.render ? col.render(val, row) : String(val ?? '')}
                    </td>
                  );
                })}
                {showActions && (
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {canEdit && (
                      <Btn
                        block={false}
                        disabled={false}
                        variant="ghost"
                        size="xs"
                        onClick={() => onEdit?.(row)}
                      >
                        Edit
                      </Btn>
                    )}
                    {canDelete && (
                      <Btn
                        block={false}
                        disabled={false}
                        variant="ghost"
                        size="xs"
                        onClick={() => onDelete?.(row)}
                      >
                        Remove
                      </Btn>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
