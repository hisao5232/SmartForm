from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.gemini_service import gemini_service
from app.services.firestore_service import firestore_service

router = APIRouter()

@router.post("/transcribe-pdf")
async def transcribe_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="PDFファイルを選択してください。")

    pdf_bytes = await file.read()
    
    # 1. Geminiで文字起こし
    transcription_text = await gemini_service.transcribe_pdf(pdf_bytes)

    # 2. Firestoreへ保存
    doc_id = await firestore_service.save_transcription(file.filename, transcription_text)

    return {
        "id": doc_id,
        "filename": file.filename,
        "transcription": transcription_text
    }
