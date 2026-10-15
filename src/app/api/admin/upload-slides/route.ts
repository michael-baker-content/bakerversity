import { uploadAsset } from '@/lib/assetUpload'
export async function POST(req: Request) { return uploadAsset(req, 'slides') }
