// src/pages/settings/PoliciesSettingsPage.jsx — Terms, Privacy (rich text), FAQs (CRUD)
import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { syncManager } from '../../sync/syncManager';
import { useSync } from '../../store/SyncContext';
import {
  PageWrap, PageHead, Card, DataTable, Badge, Btn, Modal, Field, inputStyle, EmptyState,
} from '../../components/ui';
import toast from 'react-hot-toast';

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    ['link'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ indent: '-1' }, { indent: '+1' }],
    ['clean'],
  ],
};
const QUILL_FORMATS = [
  'header', 'bold', 'italic', 'underline', 'strike',
  'list', 'bullet', 'indent', 'link',
];

const TABS = [
  { id: 'terms', label: 'Terms & Conditions', icon: '📄' },
  { id: 'privacy', label: 'Privacy Policy', icon: '🛡' },
  { id: 'faq', label: "FAQ's", icon: '❓' },
];

function formatTs(ts) {
  if (!ts) return '';
  try {
    const d = new Date(ts);
    return Number.isNaN(d.getTime()) ? String(ts) : d.toLocaleString();
  } catch {
    return String(ts);
  }
}

export default function PoliciesSettingsPage({ config, onBack }) {
  const { isOnline } = useSync();
  const qc = useQueryClient();
  const [tab, setTab] = useState('terms');
  const [termsHtml, setTermsHtml] = useState('');
  const [privacyHtml, setPrivacyHtml] = useState('');

  const [faqSearch, setFaqSearch] = useState('');
  const [showFaqForm, setShowFaqForm] = useState(false);
  const [editFaq, setEditFaq] = useState(null);

  const { data: policyDocs, isLoading: docsLoading } = useQuery({
    queryKey: ['policy-documents'],
    queryFn: async () => {
      const { data } = await syncManager.api.get('/settings/policy-documents');
      return Array.isArray(data) ? data : [];
    },
    enabled: isOnline && (tab === 'terms' || tab === 'privacy'),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!policyDocs?.length) return;
    const t = policyDocs.find((d) => d.slug === 'terms');
    const p = policyDocs.find((d) => d.slug === 'privacy');
    if (t) setTermsHtml(t.content ?? '');
    if (p) setPrivacyHtml(p.content ?? '');
  }, [policyDocs]);

  const saveDocMutation = useMutation({
    mutationFn: async ({ slug, content }) => {
      const { data } = await syncManager.api.put(`/settings/policy-documents/${slug}`, { content });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['policy-documents'] });
      toast.success('Policy saved');
    },
    onError: (err) => toast.error(err.response?.data?.error || err.message || 'Save failed'),
  });

  const { data: faqList = [], isLoading: faqLoading } = useQuery({
    queryKey: ['setting', 'policies'],
    queryFn: async () => {
      const { data } = await syncManager.api.get('/settings/policies');
      return Array.isArray(data) ? data : [];
    },
    enabled: isOnline && tab === 'faq',
    staleTime: 30_000,
  });

  const faqFiltered = useMemo(() => {
    const q = faqSearch.trim().toLowerCase();
    if (!q) return faqList;
    return faqList.filter(
      (r) =>
        String(r.question || '').toLowerCase().includes(q) ||
        String(r.answer || '').toLowerCase().includes(q)
    );
  }, [faqList, faqSearch]);

  const saveFaqMutation = useMutation({
    mutationFn: async (payload) => {
      if (editFaq?.id) {
        const { data } = await syncManager.api.put(`/settings/policies/${editFaq.id}`, payload);
        return data;
      }
      const { data } = await syncManager.api.post('/settings/policies', payload);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['setting', 'policies'] });
      setShowFaqForm(false);
      setEditFaq(null);
      toast.success(variables?.id ? 'FAQ updated' : 'FAQ added');
    },
    onError: (err) => toast.error(err.response?.data?.error || err.message || 'Save failed'),
  });

  const deleteFaqMutation = useMutation({
    mutationFn: async (id) => {
      await syncManager.api.delete(`/settings/policies/${encodeURIComponent(id)}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['setting', 'policies'] });
      toast.success('FAQ removed');
    },
    onError: (err) => toast.error(err.response?.data?.error || err.message || 'Delete failed'),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const openAddFaq = () => {
    reset({ question: '', answer: '' });
    setEditFaq(null);
    setShowFaqForm(true);
  };

  const openEditFaq = (row) => {
    reset({ question: row.question || '', answer: row.answer || '' });
    setEditFaq(row);
    setShowFaqForm(true);
  };

  const termsMeta = policyDocs?.find((d) => d.slug === 'terms');
  const privacyMeta = policyDocs?.find((d) => d.slug === 'privacy');

  return (
    <PageWrap>
      <PageHead
        title={config.label}
        subtitle="Terms & Conditions · Privacy Policy · FAQs"
        crumbs={['Home', 'Settings', config.label]}
        actions={
          <Btn variant="ghost" size="sm" onClick={onBack}>← Back</Btn>
        }
      />

      <div
        style={{
          display: 'flex',
          gap: 4,
          borderBottom: '1px solid var(--bdr)',
          marginBottom: 18,
          flexWrap: 'wrap',
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            style={{
              padding: '10px 16px',
              fontSize: 13,
              fontWeight: tab === t.id ? 600 : 500,
              fontFamily: 'var(--fb)',
              color: tab === t.id ? 'var(--blu)' : 'var(--txt3)',
              background: 'transparent',
              border: 'none',
              borderBottom: tab === t.id ? '2px solid var(--blu)' : '2px solid transparent',
              marginBottom: -1,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span aria-hidden>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {!isOnline && (
        <EmptyState icon="📡" title="Offline" message="Go online to edit policies." />
      )}

      {isOnline && (tab === 'terms' || tab === 'privacy') && (
        <Card>
          <div style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 12, color: 'var(--txt3)' }}>
                Last updated:{' '}
                {tab === 'terms'
                  ? formatTs(termsMeta?.updated_at)
                  : formatTs(privacyMeta?.updated_at)}
              </div>
              <Btn
                variant="primary"
                size="sm"
                disabled={docsLoading || saveDocMutation.isPending}
                onClick={() => {
                  const slug = tab === 'terms' ? 'terms' : 'privacy';
                  const content = tab === 'terms' ? termsHtml : privacyHtml;
                  saveDocMutation.mutate({ slug, content });
                }}
              >
                {saveDocMutation.isPending ? 'Saving…' : '✓ Save'}
              </Btn>
            </div>
            {docsLoading ? (
              <div style={{ padding: 30, textAlign: 'center', color: 'var(--txt3)' }}>Loading…</div>
            ) : (
              <div className="policies-quill-wrap" style={{ border: '1px solid var(--bdr2)', borderRadius: 8, overflow: 'hidden' }}>
                <ReactQuill
                  theme="snow"
                  value={tab === 'terms' ? termsHtml : privacyHtml}
                  onChange={tab === 'terms' ? setTermsHtml : setPrivacyHtml}
                  modules={QUILL_MODULES}
                  formats={QUILL_FORMATS}
                />
              </div>
            )}
          </div>
        </Card>
      )}

      {isOnline && tab === 'faq' && (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 360 }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--txt4)', fontSize: 13 }}>🔍</span>
              <input
                value={faqSearch}
                onChange={(e) => setFaqSearch(e.target.value)}
                placeholder="Search FAQs…"
                style={{ ...inputStyle(), paddingLeft: 32, width: '100%' }}
              />
            </div>
            <Btn variant="primary" size="sm" onClick={openAddFaq}>+ Create FAQ</Btn>
          </div>

          <Card>
            <DataTable
              loading={faqLoading}
              data={faqFiltered}
              emptyMsg="No FAQs yet"
              columns={[
                {
                  header: 'S.No',
                  key: '_sno',
                  render: (_, __, i) => (
                    <span style={{ color: 'var(--txt4)', fontSize: 11 }}>{(i ?? 0) + 1}</span>
                  ),
                },
                { header: 'Question', key: 'question', render: (v) => <span style={{ fontSize: 12 }}>{String(v ?? '—')}</span> },
                {
                  header: 'Answer',
                  key: 'answer',
                  render: (v) => (
                    <span style={{ fontSize: 12, color: 'var(--txt2)', display: 'block', maxWidth: 480, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {String(v ?? '—')}
                    </span>
                  ),
                },
                {
                  header: 'Actions',
                  key: 'id',
                  render: (_id, row) => (
                    <div style={{ display: 'flex', gap: 5 }}>
                      <Btn variant="outline" size="xs" onClick={() => openEditFaq(row)}>✎ Edit</Btn>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('Delete this FAQ?')) deleteFaqMutation.mutate(row.id);
                        }}
                        style={{
                          padding: '3px 8px', fontSize: 10, background: 'var(--red-lt)', color: 'var(--red)',
                          border: '1px solid var(--red-bdr)', borderRadius: 4, cursor: 'pointer', fontFamily: 'var(--fb)',
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ),
                },
              ]}
            />
          </Card>
        </>
      )}

      {showFaqForm && (
        <Modal
          title={editFaq ? 'Edit FAQ' : 'Create FAQ'}
          onClose={() => { setShowFaqForm(false); setEditFaq(null); }}
          footer={
            <>
              <Btn variant="ghost" onClick={() => { setShowFaqForm(false); setEditFaq(null); }}>Cancel</Btn>
              <Btn
                variant="primary"
                onClick={handleSubmit((d) => {
                  saveFaqMutation.mutate({
                    question: d.question?.trim(),
                    answer: d.answer?.trim(),
                    id: editFaq?.id,
                  });
                })}
                disabled={saveFaqMutation.isPending}
              >
                {saveFaqMutation.isPending ? 'Saving…' : '✓ Submit'}
              </Btn>
            </>
          }
        >
          <Field label="Question" required error={errors.question?.message}>
            <input
              placeholder="Enter Question"
              {...register('question', { required: 'Required' })}
              style={inputStyle(errors.question)}
            />
          </Field>
          <Field label="Answer" required error={errors.answer?.message}>
            <textarea
              rows={5}
              placeholder="Enter Answer"
              {...register('answer', { required: 'Required' })}
              style={{ ...inputStyle(errors.answer), minHeight: 100 }}
            />
          </Field>
        </Modal>
      )}
    </PageWrap>
  );
}
