// frontend/src/components/ImageGallery.jsx
// Universal image upload + gallery component.
// Usage: <ImageGallery module="product" recordId={product.id} />

import { useState, useRef, useCallback, useEffect } from "react";
import api from "../api/client";

// ─── Tiny helpers ─────────────────────────────────────────────
const fmtSize = (b) => b > 1048576 ? `${(b/1048576).toFixed(1)} MB` : `${Math.round(b/1024)} KB`;

const Spinner = () => (
  <div style={{width:20,height:20,border:"2px solid var(--color-border-tertiary)",
    borderTopColor:"#1a7a4a",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>
);

const THUMB = (media) =>
  media.thumbnails?.find(t=>t.size==="md")?.url
  || media.thumbnails?.find(t=>t.size==="sm")?.url
  || media.file_url;

// ─── Lightbox ─────────────────────────────────────────────────
function Lightbox({ images, index, onClose }) {
  const [cur, setCur] = useState(index);
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setCur(c => Math.min(c+1, images.length-1));
      if (e.key === "ArrowLeft")  setCur(c => Math.max(c-1, 0));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [images.length, onClose]);

  const img = images[cur];
  return (
    <div onClick={onClose} style={{
      position:"fixed",inset:0,background:"rgba(0,0,0,.88)",zIndex:9999,
      display:"flex",alignItems:"center",justifyContent:"center",
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        maxWidth:"90vw",maxHeight:"90vh",display:"flex",flexDirection:"column",
        gap:12,alignItems:"center",
      }}>
        <img src={img.file_url} alt={img.alt_text||img.original_name}
          style={{maxWidth:"85vw",maxHeight:"78vh",objectFit:"contain",borderRadius:8,
            boxShadow:"0 8px 40px rgba(0,0,0,.6)"}}
        />
        {img.caption && (
          <div style={{color:"rgba(255,255,255,.8)",fontSize:13,textAlign:"center",
            maxWidth:600,padding:"0 20px"}}>{img.caption}</div>
        )}
        <div style={{color:"rgba(255,255,255,.5)",fontSize:12}}>
          {cur+1} / {images.length}
          {img.width && ` · ${img.width}×${img.height}px`}
          {img.file_size && ` · ${fmtSize(img.file_size)}`}
        </div>
      </div>
      {cur > 0 && (
        <button onClick={e=>{e.stopPropagation();setCur(c=>c-1)}}
          style={{position:"fixed",left:20,top:"50%",transform:"translateY(-50%)",
            background:"rgba(255,255,255,.15)",border:"none",color:"#fff",
            borderRadius:"50%",width:44,height:44,fontSize:22,cursor:"pointer"}}>
          ‹
        </button>
      )}
      {cur < images.length-1 && (
        <button onClick={e=>{e.stopPropagation();setCur(c=>c+1)}}
          style={{position:"fixed",right:20,top:"50%",transform:"translateY(-50%)",
            background:"rgba(255,255,255,.15)",border:"none",color:"#fff",
            borderRadius:"50%",width:44,height:44,fontSize:22,cursor:"pointer"}}>
          ›
        </button>
      )}
      <button onClick={onClose}
        style={{position:"fixed",top:16,right:16,background:"rgba(255,255,255,.15)",
          border:"none",color:"#fff",borderRadius:"50%",width:36,height:36,
          fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <i className="ti ti-x"/>
      </button>
    </div>
  );
}

// ─── UploadZone ───────────────────────────────────────────────
function UploadZone({ onFiles, uploading }) {
  const [drag, setDrag] = useState(false);
  const ref = useRef();

  const handle = useCallback((files) => {
    const valid = Array.from(files).filter(f => f.type.startsWith("image/"));
    if (valid.length) onFiles(valid);
  }, [onFiles]);

  return (
    <div
      onDragOver={e=>{e.preventDefault();setDrag(true)}}
      onDragLeave={()=>setDrag(false)}
      onDrop={e=>{e.preventDefault();setDrag(false);handle(e.dataTransfer.files)}}
      onClick={()=>!uploading&&ref.current?.click()}
      style={{
        border:`2px dashed ${drag?"#1a7a4a":"var(--color-border-tertiary)"}`,
        borderRadius:10,padding:"20px 16px",textAlign:"center",
        cursor:uploading?"not-allowed":"pointer",
        background:drag?"#edf7f2":"var(--color-background-secondary)",
        transition:".15s",minHeight:90,display:"flex",flexDirection:"column",
        alignItems:"center",justifyContent:"center",gap:8,
      }}>
      <input ref={ref} type="file" multiple accept="image/*"
        style={{display:"none"}}
        onChange={e=>handle(e.target.files)}/>
      {uploading
        ? <><Spinner/><span style={{fontSize:12,color:"var(--color-text-secondary)"}}>กำลังอัพโหลด...</span></>
        : <>
          <i className="ti ti-photo-up" style={{fontSize:28,color:drag?"#1a7a4a":"var(--color-text-tertiary)"}}/>
          <div style={{fontSize:13,fontWeight:500}}>ลากรูปภาพมาวาง หรือคลิกเพื่อเลือก</div>
          <div style={{fontSize:11,color:"var(--color-text-tertiary)"}}>
            JPEG, PNG, WebP · สูงสุด 10 MB / ไฟล์ · สูงสุด 10 ไฟล์พร้อมกัน
          </div>
        </>
      }
    </div>
  );
}

// ─── ImageCard ────────────────────────────────────────────────
function ImageCard({ img, onDelete, onSetPrimary, onEdit, onPreview, disabled }) {
  const [menu, setMenu] = useState(false);
  return (
    <div style={{
      position:"relative",borderRadius:8,overflow:"hidden",
      border:`1.5px solid ${img.is_primary?"#1a7a4a":"var(--color-border-tertiary)"}`,
      background:"var(--color-background-secondary)",aspectRatio:"1",
      cursor:"pointer",
    }}>
      <img src={THUMB(img)} alt={img.alt_text||img.original_name}
        onClick={onPreview}
        style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}
      />
      {img.is_primary && (
        <div style={{position:"absolute",top:5,left:5,
          background:"#1a7a4a",color:"#fff",fontSize:10,
          padding:"2px 7px",borderRadius:10,fontWeight:500}}>
          ภาพหลัก
        </div>
      )}
      <div style={{position:"absolute",top:5,right:5}}>
        <button onClick={e=>{e.stopPropagation();setMenu(!menu)}}
          style={{width:26,height:26,borderRadius:"50%",
            background:"rgba(0,0,0,.5)",border:"none",
            color:"#fff",cursor:"pointer",display:"flex",
            alignItems:"center",justifyContent:"center",fontSize:14}}>
          <i className="ti ti-dots-vertical"/>
        </button>
        {menu && (
          <div onClick={e=>e.stopPropagation()} style={{
            position:"absolute",top:30,right:0,
            background:"var(--color-background-primary)",
            border:"0.5px solid var(--color-border-secondary)",
            borderRadius:8,minWidth:150,zIndex:10,
            boxShadow:"0 4px 20px rgba(0,0,0,.12)",overflow:"hidden",
          }}>
            {!img.is_primary && (
              <MenuItem icon="ti-star" label="ตั้งเป็นภาพหลัก"
                onClick={()=>{onSetPrimary(img.id);setMenu(false)}}/>
            )}
            <MenuItem icon="ti-pencil" label="แก้ไข caption"
              onClick={()=>{onEdit(img);setMenu(false)}}/>
            <MenuItem icon="ti-external-link" label="เปิดภาพต้นฉบับ"
              onClick={()=>{window.open(img.file_url,"_blank");setMenu(false)}}/>
            <MenuItem icon="ti-trash" label="ลบรูปภาพ" danger
              onClick={()=>{onDelete(img.id);setMenu(false)}}/>
          </div>
        )}
      </div>
      <div style={{position:"absolute",bottom:0,left:0,right:0,
        background:"linear-gradient(transparent,rgba(0,0,0,.6))",
        padding:"16px 8px 6px",pointerEvents:"none"}}>
        <div style={{fontSize:10,color:"rgba(255,255,255,.85)",
          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
          {img.caption || img.original_name}
        </div>
      </div>
    </div>
  );
}

const MenuItem = ({ icon, label, onClick, danger }) => (
  <div onClick={onClick} style={{
    display:"flex",alignItems:"center",gap:8,padding:"9px 14px",
    fontSize:12,cursor:"pointer",
    color:danger?"#c0392b":"var(--color-text-primary)",
    transition:".1s",
  }}
    onMouseEnter={e=>e.currentTarget.style.background="var(--color-background-secondary)"}
    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
    <i className={`ti ${icon}`} style={{fontSize:14}}/>{label}
  </div>
);

// ─── EditModal ────────────────────────────────────────────────
function EditModal({ img, onSave, onClose }) {
  const [alt, setAlt]     = useState(img.alt_text||"");
  const [caption, setCaption] = useState(img.caption||"");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try { await onSave(img.id, { alt_text: alt, caption }); onClose(); }
    finally { setSaving(false); }
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",
      zIndex:9998,display:"flex",alignItems:"center",justifyContent:"center"}}
      onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:"var(--color-background-primary)",
        border:"0.5px solid var(--color-border-tertiary)",
        borderRadius:12,padding:20,width:360,maxWidth:"90vw",
      }}>
        <div style={{fontSize:13,fontWeight:500,marginBottom:14,
          display:"flex",justifyContent:"space-between"}}>
          แก้ไขข้อมูลรูปภาพ
          <button onClick={onClose} style={{background:"transparent",border:"none",
            cursor:"pointer",color:"var(--color-text-tertiary)",fontSize:16}}>
            <i className="ti ti-x"/>
          </button>
        </div>
        <img src={THUMB(img)} style={{width:"100%",height:140,objectFit:"cover",
          borderRadius:8,marginBottom:14}} alt="preview"/>
        {[["Alt Text","alt",alt,setAlt],["Caption","cap",caption,setCaption]]
          .map(([label,key,val,set])=>(
          <div key={key} style={{marginBottom:10}}>
            <label style={{display:"block",fontSize:12,
              color:"var(--color-text-secondary)",marginBottom:4}}>{label}</label>
            <input value={val} onChange={e=>set(e.target.value)}
              placeholder={label}
              style={{width:"100%",padding:"7px 10px",
                border:"0.5px solid var(--color-border-tertiary)",
                borderRadius:8,background:"var(--color-background-primary)",
                color:"var(--color-text-primary)",fontSize:12,boxSizing:"border-box"}}/>
          </div>
        ))}
        <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:14}}>
          <button onClick={onClose}
            style={{padding:"7px 14px",background:"transparent",
              border:"0.5px solid var(--color-border-secondary)",
              borderRadius:8,fontSize:12,cursor:"pointer",color:"var(--color-text-secondary)"}}>
            ยกเลิก
          </button>
          <button onClick={save} disabled={saving}
            style={{padding:"7px 14px",background:"#1a7a4a",color:"#fff",
              border:"none",borderRadius:8,fontSize:12,cursor:"pointer",
              opacity:saving?.6:1}}>
            {saving?"กำลังบันทึก...":"บันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ImageGallery component ──────────────────────────────
export default function ImageGallery({
  module,
  recordId,
  compact = false,       // compact=true → show only primary thumb + count badge
  readonly = false,      // disable upload/delete/edit
  label = "รูปภาพ",
}) {
  const [images,    setImages]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [lightbox,  setLightbox]  = useState(null); // index or null
  const [editImg,   setEditImg]   = useState(null);
  const [error,     setError]     = useState(null);
  const [progress,  setProgress]  = useState([]);   // upload progress items

  const fetchImages = useCallback(async () => {
    if (!recordId) { setLoading(false); return; }
    try {
      const data = await api.get(`/media/${module}/${recordId}`);
      setImages(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [module, recordId]);

  useEffect(() => { fetchImages(); }, [fetchImages]);

  const handleUpload = async (files) => {
    setUploading(true);
    setError(null);
    const prog = files.map((f,i) => ({ id:i, name:f.name, done:false, error:null }));
    setProgress(prog);

    try {
      const fd = new FormData();
      files.forEach(f => fd.append("images", f));
      const result = await api.upload(`/media/${module}/${recordId}`, fd);
      setImages(prev => {
        // Replace or append
        const ids = new Set(result.map(r=>r.id));
        const kept = prev.filter(p=>!ids.has(p.id));
        return [...kept, ...result].sort((a,b)=>b.is_primary-a.is_primary);
      });
      setProgress([]);
    } catch (e) {
      setError(e.message);
      setProgress([]);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("ยืนยันลบรูปภาพนี้?")) return;
    try {
      await api.delete(`/media/${id}`);
      setImages(prev => prev.filter(img => img.id !== id));
    } catch (e) { setError(e.message); }
  };

  const handleSetPrimary = async (id) => {
    try {
      await api.patch(`/media/${id}/primary`, {});
      setImages(prev => prev.map(img => ({ ...img, is_primary: img.id === id })));
    } catch (e) { setError(e.message); }
  };

  const handleEditSave = async (id, data) => {
    const updated = await api.patch(`/media/${id}`, data);
    setImages(prev => prev.map(img => img.id === id ? { ...img, ...updated } : img));
  };

  // ─── Compact mode: just primary thumbnail + badge ──────────
  if (compact) {
    const primary = images.find(i=>i.is_primary) || images[0];
    if (loading) return <div style={{width:56,height:56,background:"var(--color-background-secondary)",borderRadius:8}}/>;
    return (
      <div style={{position:"relative",cursor:"pointer"}}
        onClick={()=>primary&&setLightbox(0)}>
        {primary
          ? <img src={THUMB(primary)} alt={primary.alt_text||""}
              style={{width:56,height:56,objectFit:"cover",borderRadius:8,
                border:"0.5px solid var(--color-border-tertiary)"}}/>
          : <div style={{width:56,height:56,background:"var(--color-background-secondary)",
              borderRadius:8,border:"0.5px solid var(--color-border-tertiary)",
              display:"flex",alignItems:"center",justifyContent:"center"}}>
              <i className="ti ti-photo" style={{fontSize:20,color:"var(--color-text-tertiary)"}}/>
            </div>
        }
        {images.length > 1 && (
          <div style={{position:"absolute",top:-6,right:-6,
            background:"#1a7a4a",color:"#fff",fontSize:10,
            width:18,height:18,borderRadius:"50%",
            display:"flex",alignItems:"center",justifyContent:"center",fontWeight:500}}>
            {images.length}
          </div>
        )}
        {lightbox !== null && (
          <Lightbox images={images} index={0} onClose={()=>setLightbox(null)}/>
        )}
      </div>
    );
  }

  // ─── Full gallery mode ─────────────────────────────────────
  return (
    <div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
        marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:500,display:"flex",alignItems:"center",gap:8}}>
          <i className="ti ti-photo" style={{fontSize:15,color:"#1a7a4a"}}/>
          {label}
          {images.length>0 && (
            <span style={{fontSize:11,color:"var(--color-text-tertiary)",
              background:"var(--color-background-secondary)",
              padding:"1px 8px",borderRadius:10}}>
              {images.length} รูป
            </span>
          )}
        </div>
        {!readonly && images.length > 0 && (
          <label style={{display:"inline-flex",alignItems:"center",gap:5,
            padding:"5px 12px",background:"transparent",
            border:"0.5px solid var(--color-border-secondary)",
            borderRadius:8,fontSize:12,cursor:"pointer",
            color:"var(--color-text-secondary)"}}>
            <i className="ti ti-plus" style={{fontSize:13}}/>เพิ่มรูป
            <input type="file" multiple accept="image/*" style={{display:"none"}}
              onChange={e=>handleUpload(Array.from(e.target.files))}/>
          </label>
        )}
      </div>

      {error && (
        <div style={{padding:"8px 12px",background:"#fdecea",
          border:"0.5px solid #f5b7b1",borderRadius:8,
          fontSize:12,color:"#962b2b",marginBottom:12,
          display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span><i className="ti ti-alert-circle" style={{marginRight:6}}/>{error}</span>
          <button onClick={()=>setError(null)} style={{background:"transparent",border:"none",cursor:"pointer",color:"#962b2b",fontSize:14}}>
            <i className="ti ti-x"/>
          </button>
        </div>
      )}

      {loading ? (
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",
          height:100,gap:10,color:"var(--color-text-tertiary)",fontSize:12}}>
          <Spinner/> กำลังโหลดรูปภาพ...
        </div>
      ) : (
        <>
          {/* Upload zone — shown when no images or as empty state */}
          {!readonly && images.length === 0 && (
            <UploadZone onFiles={handleUpload} uploading={uploading}/>
          )}

          {/* Upload progress */}
          {progress.length > 0 && (
            <div style={{marginBottom:12,display:"flex",flexDirection:"column",gap:6}}>
              {progress.map(p=>(
                <div key={p.id} style={{display:"flex",alignItems:"center",gap:8,
                  fontSize:12,color:"var(--color-text-secondary)"}}>
                  {p.done ? <i className="ti ti-circle-check" style={{color:"#1a7a4a",fontSize:14}}/>
                          : <Spinner/>}
                  <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>
                    {p.name}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Image grid */}
          {images.length > 0 && (
            <div style={{display:"grid",
              gridTemplateColumns:"repeat(auto-fill,minmax(100px,1fr))",
              gap:8,marginBottom:readonly?0:12}}>
              {images.map((img, idx) => (
                <ImageCard key={img.id} img={img}
                  onDelete={handleDelete}
                  onSetPrimary={handleSetPrimary}
                  onEdit={setEditImg}
                  onPreview={()=>setLightbox(idx)}
                  disabled={readonly}
                />
              ))}
              {/* Add-more cell */}
              {!readonly && (
                <label style={{
                  aspectRatio:"1",border:"1.5px dashed var(--color-border-tertiary)",
                  borderRadius:8,display:"flex",flexDirection:"column",
                  alignItems:"center",justifyContent:"center",
                  cursor:uploading?"not-allowed":"pointer",gap:4,
                  background:"var(--color-background-secondary)",
                  color:"var(--color-text-tertiary)",
                }}>
                  <i className="ti ti-plus" style={{fontSize:22}}/>
                  <span style={{fontSize:10}}>เพิ่มรูป</span>
                  <input type="file" multiple accept="image/*" style={{display:"none"}}
                    disabled={uploading}
                    onChange={e=>handleUpload(Array.from(e.target.files))}/>
                </label>
              )}
            </div>
          )}

          {/* Empty state for readonly */}
          {images.length === 0 && readonly && (
            <div style={{textAlign:"center",padding:"24px 0",
              color:"var(--color-text-tertiary)",fontSize:12}}>
              <i className="ti ti-photo-off" style={{fontSize:28,display:"block",marginBottom:6}}/>
              ไม่มีรูปภาพ
            </div>
          )}
        </>
      )}

      {/* Lightbox */}
      {lightbox !== null && (
        <Lightbox images={images} index={lightbox} onClose={()=>setLightbox(null)}/>
      )}

      {/* Edit modal */}
      {editImg && (
        <EditModal img={editImg} onSave={handleEditSave} onClose={()=>setEditImg(null)}/>
      )}
    </div>
  );
}
