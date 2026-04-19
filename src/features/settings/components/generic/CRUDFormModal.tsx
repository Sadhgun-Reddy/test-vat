import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Modal } from '../../../../components/ui';
import { Btn } from '../../../../components/ui';
import { Field } from '../../../../components/ui';
import { syncManager } from '../../../../sync/syncManager';
import { EntityConfig, ID } from '../../config/types';

type CRUDFormModalProps<T extends { id: ID }> = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<T>) => Promise<void>;
  config: EntityConfig<T>;
  initialValues?: Partial<T>;
  isSubmitting: boolean;
  mode: 'create' | 'edit';
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const inputStyle = (error?: any) => ({
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: `1px solid ${error ? 'var(--red)' : 'var(--bdr)'}`,
  fontSize: 14,
  outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
  background: 'var(--bg)',
  boxShadow: error ? '0 0 0 3px rgba(239,68,68,0.1)' : 'none',
});

// Helper for dynamic options
const useDynamicOptions = (fromKey?: string) => {
  return useQuery({
    queryKey: ['setting', fromKey],
    queryFn: async () => {
      if (!fromKey) return [];
      const { data } = await syncManager.api.get(`/settings/${fromKey}`);
      return Array.isArray(data) ? data : [];
    },
    enabled: !!fromKey,
  });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function CRUDFormModal<T extends { id: ID; permissions?: any }>({
  isOpen,
  onClose,
  onSubmit,
  config,
  initialValues,
  isSubmitting,
  mode,
}: CRUDFormModalProps<T>) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(config.validationSchema),
    defaultValues: initialValues || (config.defaultFormValues as Record<string, unknown>),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [permMatrix] = useState<any>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (initialValues as any)?.permissions || {}
  );

  if (!isOpen) return null;

  const handleFormSubmit = async (data: Record<string, unknown>) => {
    const payload = { ...data };
    if (config.permissionMatrix) {
      Object.assign(payload, { permissions: permMatrix });
    }
    await onSubmit(payload as unknown as Partial<T>);
  };

  return (
    <Modal
      title={`${mode === 'create' ? 'Add' : 'Edit'} ${config.entityLabel}`}
      sub={config.permissionMatrix ? 'Set module access: View, Add, Edit, Delete, and Import.' : ''}
      onClose={onClose}
      size={config.permissionMatrix ? 'xxl' : 'sm'}
      footer={
        <>
          <Btn disabled={false} block={false} variant="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn
            block={false}
            variant="primary"
            onClick={handleSubmit(handleFormSubmit)}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : '✓ Save'}
          </Btn>
        </>
      }
    >
      {(config.formFields || []).map((field, i) => (
        <FormFieldComponent
          key={i}
          field={field}
          register={register}
          errors={errors}
          control={control}
          watch={watch}
        />
      ))}

      {/* Assuming we will inject DesignationPermissionMatrix somehow or stub it */}
      {config.permissionMatrix && (
        <div style={{ marginTop: 16 }}>
          <p className="text-sm font-medium mb-2">
            Permission Matrix mapping not yet fully ported.
          </p>
        </div>
      )}
    </Modal>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function FormFieldComponent({ field, register, errors, control: _control, watch }: any) {
  const optionsQuery = useDynamicOptions(field.optionsFrom);
  const watchDistrictId = watch('district_id');

  if (field.type === 'checkbox' || field.type === 'boolean') {
    return (
      <div style={{ marginBottom: 12 }}>
        <label
          style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}
        >
          <input type="checkbox" {...register(field.name)} />
          <span style={{ fontWeight: 500 }}>{field.label}</span>
        </label>
      </div>
    );
  }

  let opts = field.options || [];
  if (field.optionsFrom && optionsQuery.data) {
    opts = optionsQuery.data;
    if (field.filterByDistrict && watchDistrictId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      opts = opts.filter((r: any) => String(r.district_id) === String(watchDistrictId));
    }
  }

  const err = errors[field.name];

  return (
    <div style={{ marginBottom: 12 }}>
      <Field help="" label={field.label} required={field.required} error={err?.message as string}>
        {field.type === 'textarea' ? (
          <textarea
            rows={4}
            placeholder={field.placeholder}
            {...register(field.name)}
            style={{ ...inputStyle(err), minHeight: 80 }}
          />
        ) : field.type === 'select' ? (
          <select
            {...register(field.name)}
            style={inputStyle(err)}
            disabled={field.filterByDistrict && !watchDistrictId}
          >
            <option value="">
              {field.filterByDistrict && !watchDistrictId
                ? 'Select district first...'
                : field.placeholderSelect || (field.required ? 'Select...' : '(optional)')}
            </option>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {opts.map((row: any) => {
              const val = field.optionsFrom ? row.id : (row.value ?? row);
              let lab = field.optionsFrom ? row[field.optionLabel || 'name'] : (row.label ?? row);
              if (field.optionSub && row[field.optionSub]) {
                lab = `${lab} (${row[field.optionSub]})`;
              } else if (field.optionLabel === 'quarter_no') {
                lab = `Q${row.quarter_no}${row.fy_label ? ` · ${row.fy_label}` : ''}`;
              }
              return (
                <option key={String(val)} value={String(val)}>
                  {String(lab)}
                </option>
              );
            })}
          </select>
        ) : (
          <input
            type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
            step={field.type === 'number' ? 'any' : undefined}
            placeholder={field.placeholder}
            {...register(field.name)}
            style={inputStyle(err)}
          />
        )}
      </Field>
    </div>
  );
}
