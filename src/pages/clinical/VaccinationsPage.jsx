// Page stubs — each follows identical offline-first pattern as CasesPage.jsx
// Full implementation omitted for brevity; structure is identical:
// 1. useQuery → syncManager.api.get (online) or getAll from offlineStore (offline)
// 2. useMutation → upsertAndEnqueue (offline) or api.post (online)
// 3. PageWrap + PageHead + KPIGrid + DataTable + Modal form

// ── src/pages/clinical/VaccinationsPage.jsx ───────────────────
import React,{useState} from 'react';
import {useQuery,useMutation,useQueryClient} from '@tanstack/react-query';
import {syncManager} from '../../sync/syncManager';
import {useSync} from '../../store/SyncContext';
import {upsertAndEnqueue} from '../../sync/offlineStore';
import {PageWrap,PageHead,KPIGrid,KPICard,Card,DataTable,Badge,Btn,Modal,Field,inputStyle} from '../../components/ui';
import {useForm} from 'react-hook-form';
import toast from 'react-hot-toast';

export function VaccinationsPage(){
  const {isOnline}=useSync();
  const [showForm,setShowForm]=useState(false);
  const qc=useQueryClient();
  const {data,isLoading}=useQuery({queryKey:['vaccinations'],queryFn:async()=>{const{data}=await syncManager.api.get('/vaccinations?limit=50');return data;},enabled:isOnline});
  const vacc=data?.vaccinations||[];
  const create=useMutation({
    mutationFn:async(fd)=>{if(isOnline){const{data}=await syncManager.api.post('/vaccinations',fd);return data;}return upsertAndEnqueue('vaccinations',fd,'INSERT');},
    onSuccess:()=>{qc.invalidateQueries({queryKey:['vaccinations']});setShowForm(false);toast.success('Vaccination recorded');},
    onError:(err)=>{toast.error(err.response?.data?.error||err.message||'Failed to record vaccination');},
  });
  const vaccines=['FMD','HS','BQ','LSD','PPR','Anthrax','Rabies'];
  const {register,handleSubmit}=useForm({defaultValues:{farmer_name:'',date_of_vaccination:new Date().toISOString().slice(0,10),dose_ml:2,vaccination_type:vaccines[0]}});
  return(<PageWrap>
    <PageHead title="Vaccinations" subtitle={`Immunisation programme records · ${vacc.length} records`} crumbs={['Home','Clinical','Vaccinations']} actions={<Btn variant="primary" size="sm" onClick={()=>setShowForm(true)}>+ New Record</Btn>}/>
    <KPIGrid>{vaccines.map(v=><KPICard key={v} label={v} value={vacc.filter(d=>d.vaccine_name===v).length} sub="doses" color="green"/>)}</KPIGrid>
    <Card><DataTable loading={isLoading} data={vacc} emptyMsg="No vaccination records" columns={[
      {header:'Farmer',key:'farmer_name',render:v=><strong>{v}</strong>},
      {header:'District',key:'district_name'},
      {header:'Animal',key:'animal_type_name',render:v=><Badge>{v||'—'}</Badge>},
      {header:'Vaccine',key:'vaccine_name',render:v=><Badge color="green">{v||'—'}</Badge>},
      {header:'Dose (ml)',key:'dose_ml',render:v=><span style={{fontFamily:'var(--fm)'}}>{v}</span>},
      {header:'Date',key:'date_of_vaccination',render:v=>new Date(v).toLocaleDateString('en-IN')},
      {header:'Sync',key:'sync_status',render:v=><Badge color={v==='synced'?'green':'amber'}>{v==='synced'?'✓':'⟳'}</Badge>},
    ]}/></Card>
    {showForm&&<Modal title="Record Vaccination" onClose={()=>setShowForm(false)} footer={<><Btn variant="ghost" onClick={()=>setShowForm(false)}>Cancel</Btn><Btn variant="primary" onClick={handleSubmit(d=>create.mutate(d))} disabled={create.isPending}>{create.isPending?'Saving…':'✓ Record'}</Btn></>}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
        <Field label="Farmer Name" required><input {...register('farmer_name',{required:true})} style={inputStyle()}/></Field>
        <Field label="Date"><input {...register('date_of_vaccination')} type="date" style={inputStyle()}/></Field>
        <Field label="Vaccine"><select {...register('vaccination_type')} style={inputStyle()}>{vaccines.map(v=><option key={v} value={v}>{v}</option>)}</select></Field>
        <Field label="Dose (ml)"><input {...register('dose_ml')} type="number" step="0.5" style={inputStyle()}/></Field>
        <Field label="Batch No."><input {...register('batch_no')} placeholder="BTH-XXXXXX" style={inputStyle()}/></Field>
      </div>
    </Modal>}
  </PageWrap>);
}
export default VaccinationsPage;