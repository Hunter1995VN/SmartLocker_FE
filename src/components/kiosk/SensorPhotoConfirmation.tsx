import { useEffect, useRef, useState } from 'react';
import { kioskApi } from '../../api/kioskService';
import { kioskText } from '../../utils/kioskMessages';
import type { KioskLanguage } from '../../utils/kioskI18n';
interface Props { lang: KioskLanguage; stationId: string; bookingId: string; lockerId: string; sessionToken: string; onClose: () => void; onSubmitted: () => void }
export default function SensorPhotoConfirmation({ lang, stationId, bookingId, lockerId, sessionToken, onClose, onSubmitted }: Props) {
    const x=kioskText(lang); const video=useRef<HTMLVideoElement>(null);
    const [photo,setPhoto]=useState(''); const [error,setError]=useState(''); const [busy,setBusy]=useState(false); const [ready,setReady]=useState(false);
    useEffect(()=>{
        let cancelled=false; let stream: MediaStream | undefined;
        void navigator.mediaDevices?.getUserMedia({video:{facingMode:'environment',width:{ideal:1280},height:{ideal:720}},audio:false})
            .then(value=>{ if(cancelled) {value.getTracks().forEach(t=>t.stop());return;} stream=value;if(video.current)video.current.srcObject=value; })
            .catch(()=>{if(!cancelled)setError(kioskText(lang)('cameraError'));});
        if(!navigator.mediaDevices?.getUserMedia)setError(kioskText(lang)('cameraError'));
        return ()=>{cancelled=true;stream?.getTracks().forEach(t=>t.stop());};
    },[lang]);
    function capture(){
        if(!video.current || !video.current.videoWidth)return;
        const scale=Math.min(1,1280/video.current.videoWidth); const canvas=document.createElement('canvas');
        canvas.width=Math.round(video.current.videoWidth*scale);canvas.height=Math.round(video.current.videoHeight*scale);
        canvas.getContext('2d')?.drawImage(video.current,0,0,canvas.width,canvas.height); setPhoto(canvas.toDataURL('image/jpeg',0.8));
    }
    async function submit(){
        if(!photo || busy)return;setBusy(true);setError('');
        try{const res=await kioskApi.manualConfirm({stationId,bookingId,lockerId,sessionToken,photoBase64:photo});if(res.success)onSubmitted();else setError(x('submitError'));}
        catch{setError(x('submitError'));}finally{setBusy(false);}
    }
    return <div role="dialog" aria-modal="true" aria-label={x('sensorTitle')} className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-5">
        <section className="my-auto w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 text-slate-900">
            <h2 className="text-xl font-bold">{x('sensorTitle')}</h2><p>{x('sensorHint')}</p>
            <video ref={video} autoPlay playsInline muted onLoadedData={()=>setReady(true)} className={photo?'hidden':'w-full rounded'}/>
            {photo && <img src={photo} alt={x('photoPreview')} className="w-full rounded"/>}
            {error && <p role="alert" className="text-red-700">{error}</p>}
            {!photo ? <button type="button" disabled={!ready || !!error} onClick={capture} className="rounded border p-3 disabled:opacity-50">{x('capturePhoto')}</button>
                : <><button type="button" disabled={busy} onClick={()=>setPhoto('')} className="rounded border p-3">{x('retakePhoto')}</button>
                    <button type="button" disabled={busy} onClick={()=>void submit()} className="ml-3 rounded bg-blue-700 p-3 text-white">{busy?x('sending'):x('sendPhoto')}</button></>}
            <button type="button" onClick={onClose} disabled={busy} className="block underline">{x('return')}</button>
        </section>
    </div>;
}
