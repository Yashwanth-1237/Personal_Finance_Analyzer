"""Receipt image validation and best-effort amount/date extraction."""
from datetime import date
from io import BytesIO
import re

from flask import current_app
from PIL import Image, ImageOps, UnidentifiedImageError
import pytesseract
from pytesseract import TesseractNotFoundError

from utils import ApiError

MAX_RECEIPT_BYTES = 6 * 1024 * 1024
MAX_IMAGE_PIXELS = 20_000_000
OCR_DATE_PATTERNS = (
    re.compile(r"(?<!\d)(20\d{2})\s*[./-]\s*(\d{1,2})\s*[./-]\s*(\d{1,2})(?!\d)"),
    re.compile(r"(?<!\d)(20\d{2})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일?"),
    re.compile(r"(?<!\d)(\d{1,2})/(\d{1,2})/(20\d{2})(?!\d)"),
)
DATE_TEXT_PATTERN = re.compile(
    r"(?<!\d)(?:20\d{2}\s*[./-]\s*\d{1,2}\s*[./-]\s*\d{1,2}"
    r"|20\d{2}\s*년\s*\d{1,2}\s*월\s*\d{1,2}\s*일?"
    r"|\d{1,2}/\d{1,2}/20\d{2})(?!\d)"
)
AMOUNT_PATTERN = re.compile(r"(?<!\d)(?:\d{1,3}(?:,\d{3})+|\d{4,})(?:\.\d{1,2})?(?!\d)")
TOTAL_LABEL_PATTERN = re.compile(
    r"총\s*결제|결제\s*금액|받을\s*금액|합\s*계|총\s*액|total|amount\s+due|grand\s+total",
    re.IGNORECASE,
)


def normalize_receipt_image(data):
    if not data or len(data) > MAX_RECEIPT_BYTES:
        raise ApiError("Receipt images must be no larger than 6 MB.", fields={"receipt": "Maximum 6 MB."})

    try:
        with Image.open(BytesIO(data)) as source:
            if source.format not in {"JPEG", "PNG", "WEBP"}:
                raise ApiError("Upload a JPEG, PNG, or WebP receipt image.", fields={"receipt": "Unsupported image type."})
            if source.width * source.height > MAX_IMAGE_PIXELS:
                raise ApiError("The receipt image dimensions are too large.", fields={"receipt": "Image is too large."})
            source.verify()
        with Image.open(BytesIO(data)) as source:
            image = ImageOps.exif_transpose(source).convert("RGB")
            image.thumbnail((2200, 2200))
            output = BytesIO()
            image.save(output, format="JPEG", quality=82, optimize=True)
            return output.getvalue()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise ApiError("The uploaded file is not a valid receipt image.", fields={"receipt": "Invalid image."}) from exc


def _extract_date(text):
    for index, pattern in enumerate(OCR_DATE_PATTERNS):
        match = pattern.search(text)
        if not match:
            continue
        parts = [int(value) for value in match.groups()]
        if index == 2:
            month, day, year = parts
        else:
            year, month, day = parts
        try:
            return date(year, month, day).isoformat()
        except ValueError:
            continue
    return None


def _extract_amount(text):
    clean_text = DATE_TEXT_PATTERN.sub(" ", text)
    preferred_lines = [line for line in clean_text.splitlines() if TOTAL_LABEL_PATTERN.search(line)]
    candidate_lines = preferred_lines or clean_text.splitlines()
    candidates = []
    for line in candidate_lines:
        for value in AMOUNT_PATTERN.findall(line):
            amount = float(value.replace(",", ""))
            if 0 < amount <= 100_000_000:
                candidates.append(amount)
    if not candidates:
        return None
    return int(round(candidates[-1] if preferred_lines else max(candidates)))


def scan_receipt(data):
    normalized = normalize_receipt_image(data)
    try:
        with Image.open(BytesIO(normalized)) as image:
            text = pytesseract.image_to_string(image, lang="eng+kor", config="--psm 6")
    except TesseractNotFoundError as exc:
        current_app.logger.error("Tesseract is unavailable for receipt scanning.")
        raise ApiError("Receipt scanning is temporarily unavailable.", 503) from exc
    except pytesseract.TesseractError as exc:
        current_app.logger.error("Tesseract could not scan a receipt image.")
        raise ApiError("Could not read this receipt. Please enter the amount and date manually.") from exc

    return {
        "amount": _extract_amount(text),
        "expense_date": _extract_date(text),
    }, normalized
