import { imageTypes, readImageRequest } from './image-request';

export type BillImage = { imageBase64: string; mimeType: string };
type BillImagesResult = {ok:true;value:{images:BillImage[];hint:string}} | {ok:false;status:number;error:string};
export const billImageLimits = {count:4,bytes:3_200_000,body:4_400_000};
const fail = (status:number,error:string): BillImagesResult => ({ok:false,status,error});

/** One bill, either a legacy photo/PDF or ordered overlapping receipt sections. */
export async function readBillImagesRequest(request: Request): Promise<BillImagesResult> {
  if (!(request.headers.get('content-type') ?? '').includes('application/json')) {
    const parsed = await readImageRequest(request,'providerHint','No bill image was provided for analysis.',[...imageTypes,'application/pdf']);
    return parsed.ok ? {ok:true,value:{images:[{imageBase64:parsed.value.imageBase64,mimeType:parsed.value.mimeType}],hint:parsed.value.hint}} : parsed;
  }
  if (Number(request.headers.get('content-length')) > billImageLimits.body) return fail(413,'These photos are too large. Try fewer sections or a clearer photo.');
  const reader = request.body?.getReader();
  if (!reader) return fail(400,'No bill image was provided for analysis.');
  let size=0,raw=''; const decoder=new TextDecoder();
  try {
    while (true) {
      const {value,done}=await reader.read(); if(done)break;
      size+=value.byteLength;
      if(size>billImageLimits.body){await reader.cancel();return fail(413,'These photos are too large. Try fewer sections or a clearer photo.');}
      raw+=decoder.decode(value,{stream:true});
    }
    raw+=decoder.decode();
  } catch { return fail(400,'That bill request could not be opened.'); }
  finally {reader.releaseLock();}
  let body: Record<string,unknown>;
  try { body=JSON.parse(raw); } catch {return fail(400,'That bill request could not be opened.');}
  if(!body || typeof body!=='object' || Array.isArray(body))return fail(400,'No bill image was provided for analysis.');
  const multi = 'images' in body;
  const inputs=multi ? body.images : [{imageBase64:body.imageBase64,mimeType:body.mimeType ?? 'image/jpeg'}];
  if(!Array.isArray(inputs) || !inputs.length || inputs.length>billImageLimits.count)return fail(400,'Use between 1 and 4 sections of the same receipt.');
  const images:BillImage[]=[];let bytes=0;
  for(const input of inputs){
    if(!input || typeof input!=='object' || typeof input.imageBase64!=='string')return fail(400,'No bill image was provided for analysis.');
    const imageBase64=input.imageBase64.replace(/^data:[^,]*,/,'');
    const mimeType=typeof input.mimeType==='string' ? input.mimeType : 'image/jpeg';
    if(![...imageTypes,...(!multi?['application/pdf']:[])].includes(mimeType))return fail(415,'Use JPG, PNG, WebP or HEIC receipt sections. PDFs can be uploaded separately.');
    if(!imageBase64 || imageBase64.length%4!==0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(imageBase64))return fail(400,'That image data could not be opened.');
    bytes+=imageBase64.length/4*3-(imageBase64.endsWith('==')?2:imageBase64.endsWith('=')?1:0);
    if(bytes>billImageLimits.bytes)return fail(413,'These photos are too large. Try fewer sections or a clearer photo.');
    images.push({imageBase64,mimeType});
  }
  return {ok:true,value:{images,hint:typeof body.providerHint==='string'?body.providerHint.trim().slice(0,80):''}};
}
