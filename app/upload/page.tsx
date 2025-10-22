'use client'; import { useState } from 'react';
export default function UploadPage(){
  const [files,setFiles]=useState<FileList|null>(null); const [unitid,setUnitid]=useState(''); const [status,setStatus]=useState('');
  async function onSubmit(e:React.FormEvent){ e.preventDefault(); if(!files||files.length===0) return;
    const form=new FormData(); Array.from(files).forEach(f=>form.append('files',f)); if(unitid) form.append('unitid',unitid);
    setStatus('Uploading...'); const res=await fetch('/api/upload',{method:'POST',body:form}); setStatus(res.ok?`Uploaded ${(await res.json()).saved} file(s).`:'Upload failed'); }
  return (<div><h1>Upload files</h1>
    <form onSubmit={onSubmit}>
      <label>(Optional) IPEDS unitid: <input type="text" value={unitid} onChange={e=>setUnitid(e.target.value)} placeholder="e.g., 110635" style={{display:'block',padding:8,width:240,marginTop:4}}/></label>
      <label style={{display:'block',marginTop:12}}>Choose files (PDF, CSV, JPEG): <input type="file" multiple onChange={e=>setFiles(e.target.files)}/></label>
      <div style={{marginTop:12}}><button type="submit">Upload</button></div>
    </form><p>{status}</p></div>);
}
