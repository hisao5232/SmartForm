from fastapi import APIRouter, UploadFile, File, HTTPException, status
from app.services.gemini_service import gemini_service

router = APIRouter(prefix="/api/v1/ocr", tags=["OCR"])

@router.post("/transcribe-pdf")
async def transcribe_pdf(file: UploadFile = File(...)):
    # MIMEタイプのチェック
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="アップロードできるファイルはPDF形式のみです。"
        )

    try:
        pdf_bytes = await file.read()
        extracted_text = await gemini_service.transcribe_pdf(pdf_bytes)
        
        return {
            "filename": file.filename,
            "transcription": extracted_text
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OCR処理中にエラーが発生しました: {str(e)}"
        )
